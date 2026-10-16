// services/push.service.js — notifications push Web Push / VAPID (cahier V2 · NOT-02)
//
// Envoyées pour chaque notification client (statut, annonce). Le service worker
// ne les affiche que si l'app n'est pas ouverte à l'écran (sinon : bandeau interne).
const webpush = require("web-push");
const db = require("../config/db");

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const enabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (enabled) {
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:noreply@movecash.site", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("⚠️  push: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absentes, notifications push désactivées");
}

const publicKey = () => (enabled ? VAPID_PUBLIC_KEY : null);

// ─── Abonnements ─────────────────────────────────────────────────────────────

const assertSubscription = ({ endpoint, keys }) => {
  if (!endpoint || !/^https:\/\//.test(endpoint) || !keys?.p256dh || !keys?.auth) {
    throw Object.assign(new Error("Abonnement push invalide"), { status: 400 });
  }
};

const subscribe = async (clientId, { endpoint, keys, device }) => {
  assertSubscription({ endpoint, keys });
  // Un même appareil (endpoint) appartient au dernier client connecté dessus
  await db.query(
    `INSERT INTO push_subscriptions (client_id, endpoint, p256dh, auth, device)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET client_id = EXCLUDED.client_id, p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth, device = EXCLUDED.device`,
    [clientId, endpoint, keys.p256dh, keys.auth, device ? String(device).slice(0, 255) : null]
  );
};

const unsubscribe = async (clientId, endpoint) => {
  await db.query(`DELETE FROM push_subscriptions WHERE client_id = $1 AND endpoint = $2`, [clientId, endpoint]);
};

// ─── Envoi ───────────────────────────────────────────────────────────────────

const toPayload = (n) =>
  JSON.stringify({
    title: n.title,
    body: n.body || "",
    link: n.link || "/notifications",
    // Un même transfert remplace sa notification précédente au lieu de s'empiler
    tag: n.data?.tracking_code ? `trx-${n.data.tracking_code}` : `notif-${n.id}`,
  });

// ─── Personnel : admins, semi-admins, agents (remplace les e-mails) ─────────

const STAFF_ROLES = ["admin", "semi-admin", "agent"];

const subscribeStaff = async (role, staffId, { endpoint, keys, device }) => {
  if (!STAFF_ROLES.includes(role)) throw Object.assign(new Error("Rôle invalide"), { status: 403 });
  assertSubscription({ endpoint, keys });
  await db.query(
    `INSERT INTO staff_push_subscriptions (staff_role, staff_id, endpoint, p256dh, auth, device)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE
       SET staff_role = EXCLUDED.staff_role, staff_id = EXCLUDED.staff_id,
           p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, device = EXCLUDED.device`,
    [role, staffId, endpoint, keys.p256dh, keys.auth, device ? String(device).slice(0, 255) : null]
  );
};

const unsubscribeStaff = async (role, staffId, endpoint) => {
  await db.query(
    `DELETE FROM staff_push_subscriptions WHERE staff_role = $1 AND staff_id = $2 AND endpoint = $3`,
    [role, staffId, endpoint]
  );
};

const isStaffSubscribed = async (role, staffId, endpoint) => {
  const { rows } = await db.query(
    `SELECT 1 FROM staff_push_subscriptions WHERE staff_role = $1 AND staff_id = $2 AND endpoint = $3`,
    [role, staffId, endpoint]
  );
  return rows.length > 0;
};

/**
 * Notifie le personnel.
 *   targets : { roles: ["admin", "semi-admin"], agentIds: [3] }
 *   build   : (role) => { title, body, link, tag } — le lien dépend de l'espace (admin, agent…)
 * Seuls les comptes actifs sont notifiés.
 */
const sendToStaff = async ({ roles = [], agentIds = [] }, build) => {
  if (!enabled || (!roles.length && !agentIds.length)) return;
  const { rows } = await db.query(
    `SELECT s.id, s.staff_role, s.endpoint, s.p256dh, s.auth
     FROM staff_push_subscriptions s
     LEFT JOIN admins      a  ON s.staff_role = 'admin'      AND a.id  = s.staff_id
     LEFT JOIN semi_admins sa ON s.staff_role = 'semi-admin' AND sa.id = s.staff_id
     LEFT JOIN agents      ag ON s.staff_role = 'agent'      AND ag.id = s.staff_id
     WHERE (s.staff_role = ANY($1) OR (s.staff_role = 'agent' AND s.staff_id = ANY($2)))
       AND COALESCE(a.is_active, sa.is_active, ag.is_active) = true
       AND COALESCE(a.deleted_at, sa.deleted_at, ag.deleted_at) IS NULL`,
    [roles, agentIds.filter(Boolean)]
  );
  for (const role of STAFF_ROLES) {
    const subs = rows.filter((r) => r.staff_role === role);
    if (subs.length) await sendToSubscriptions(subs, JSON.stringify(build(role)), "staff_push_subscriptions");
  }
};

// table : où supprimer les abonnements expirés (clients ou personnel)
const sendToSubscriptions = async (subs, payload, table = "push_subscriptions") => {
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 24 * 3600 })
    )
  );
  // Abonnements expirés ou révoqués par le navigateur : on les supprime
  const gone = subs.filter((_, i) => [404, 410].includes(results[i].reason?.statusCode)).map((s) => s.id);
  if (gone.length) await db.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [gone]);
  results.forEach((r) => {
    if (r.status === "rejected" && ![404, 410].includes(r.reason?.statusCode)) {
      console.error("❌ push:", r.reason?.statusCode || "", r.reason?.body || r.reason?.message);
    }
  });
};

// notification : ligne de la table notifications (avec client_id)
const sendNotification = async (clientId, notification) => {
  if (!enabled) return;
  const { rows } = await db.query(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     JOIN clients c ON c.id = ps.client_id
     WHERE ps.client_id = $1 AND c.push_enabled = true AND c.deleted_at IS NULL`,
    [clientId]
  );
  if (rows.length) await sendToSubscriptions(rows, toPayload(notification));
};

// Annonce : une seule requête pour tous les destinataires
const sendAnnouncement = async (notificationsByClient) => {
  if (!enabled || !notificationsByClient.length) return;
  const byClient = Object.fromEntries(notificationsByClient.map((n) => [n.client_id, n]));
  const { rows } = await db.query(
    `SELECT ps.id, ps.client_id, ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     JOIN clients c ON c.id = ps.client_id
     WHERE ps.client_id = ANY($1) AND c.push_enabled = true AND c.deleted_at IS NULL`,
    [Object.keys(byClient).map(Number)]
  );
  // Par lots pour ne pas ouvrir des milliers de connexions d'un coup
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await Promise.all(batch.map((s) => sendToSubscriptions([s], toPayload(byClient[s.client_id]))));
  }
};

module.exports = {
  enabled, publicKey, subscribe, unsubscribe, sendNotification, sendAnnouncement,
  subscribeStaff, unsubscribeStaff, isStaffSubscribed, sendToStaff,
};
