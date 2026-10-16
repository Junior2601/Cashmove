// services/announcement.service.js — annonces aux clients, immédiates ou programmées
// (cahier V2 · acteurs : admin « envoi d'annonces », NOT-04)
const db = require("../config/db");
const History = require("../models/history.model");
const { broadcastAnnouncement } = require("../realtime");

class AnnouncementError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_AHEAD_DAYS = 365;
const LINK_PATTERN = /^\/[\w\-/?=&.%]*$/;   // pages de l'app uniquement

// Dates renvoyées en ISO UTC : le navigateur de l'admin les affiche dans son fuseau
const SELECT = `
  SELECT a.id, a.title, a.body, a.link, a.status, a.recipients, a.error,
         to_char(a.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS scheduled_at,
         to_char(a.sent_at      AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS sent_at,
         to_char(a.created_at   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         ad.name AS created_by_name,
         (SELECT COUNT(*)::INT FROM notifications n
          WHERE n.announcement_id = a.id AND n.read_at IS NOT NULL) AS read_count
  FROM announcements a
  LEFT JOIN admins ad ON ad.id = a.created_by
`;

const findById = async (id) => {
  const { rows } = await db.query(`${SELECT} WHERE a.id = $1`, [id]);
  return rows[0] || null;
};

// Vérifie et normalise les champs ; scheduledAt = null → envoi immédiat
const validate = ({ title, body, link, scheduled_at }) => {
  const clean = {
    title: String(title || "").trim(),
    body: String(body || "").trim() || null,
    link: String(link || "").trim() || null,
    scheduledAt: null,
  };
  if (!clean.title || clean.title.length > 150) {
    throw new AnnouncementError(400, "Titre requis (150 caractères max)");
  }
  if (clean.body && clean.body.length > 500) {
    throw new AnnouncementError(400, "Message trop long (500 caractères max)");
  }
  if (clean.link && !LINK_PATTERN.test(clean.link)) {
    throw new AnnouncementError(400, "Le lien doit être une page de l'app, ex. /envoyer");
  }
  if (scheduled_at) {
    const date = new Date(scheduled_at);
    if (isNaN(date)) throw new AnnouncementError(400, "Date de programmation invalide");
    const ahead = date.getTime() - Date.now();
    if (ahead < -60 * 1000) throw new AnnouncementError(400, "La date de programmation est déjà passée");
    if (ahead > MAX_AHEAD_DAYS * 86400 * 1000) throw new AnnouncementError(400, "Programmation limitée à un an");
    // Moins d'une minute : autant envoyer tout de suite
    clean.scheduledAt = ahead > 60 * 1000 ? date.toISOString() : null;
  }
  return clean;
};

const log = (adminId, action, announcement, extra = {}) =>
  History.create({
    action_type: action,
    actor_type: adminId ? "admin" : "system",
    actor_id: adminId || null,
    entity_type: "announcement",
    entity_id: announcement.id,
    description: `${{
      announcement_scheduled: "Annonce programmée",
      announcement_sent: "Annonce envoyée",
      announcement_cancelled: "Annonce annulée",
      announcement_updated: "Annonce modifiée",
      announcement_failed: "Échec d'envoi d'annonce",
    }[action] || action} : ${announcement.title}`,
    metadata: { title: announcement.title, scheduled_at: announcement.scheduled_at, ...extra },
  }).catch((e) => console.error("History (non-bloquant):", e.message));

// ─── Envoi ───────────────────────────────────────────────────────────────────

// Envoie une annonce déjà réservée (status = 'sending')
const deliver = async (row, adminId = null) => {
  try {
    const { recipients } = await broadcastAnnouncement({
      title: row.title,
      body: row.body,
      link: row.link,
      announcementId: row.id,
    });
    await db.query(
      `UPDATE announcements SET status = 'sent', recipients = $2, sent_at = NOW(), error = NULL WHERE id = $1`,
      [row.id, recipients]
    );
    log(adminId, "announcement_sent", row, { recipients });
    return recipients;
  } catch (err) {
    console.error(`❌ annonce ${row.id}:`, err.message);
    await db.query(`UPDATE announcements SET status = 'failed', error = $2 WHERE id = $1`, [row.id, err.message.slice(0, 500)]);
    log(adminId, "announcement_failed", row, { error: err.message });
    return null;
  }
};

// Annonces arrivées à échéance. FOR UPDATE SKIP LOCKED : jamais d'envoi en double,
// même si plusieurs serveurs exécutent le job en même temps.
const dispatchDue = async () => {
  const { rows } = await db.query(
    `UPDATE announcements SET status = 'sending'
     WHERE id IN (
       SELECT id FROM announcements
       WHERE status = 'scheduled' AND scheduled_at <= NOW()
       ORDER BY scheduled_at
       LIMIT 20
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, title, body, link, scheduled_at`
  );
  for (const row of rows) await deliver(row);
  return rows.length;
};

// Envoi interrompu (serveur arrêté pendant l'envoi) : marqué en échec, visible par l'admin
const recoverStuck = async () => {
  const { rowCount } = await db.query(
    `UPDATE announcements SET status = 'failed', error = 'Envoi interrompu (redémarrage du serveur)'
     WHERE status = 'sending' AND updated_at < NOW() - INTERVAL '10 minutes'`
  );
  if (rowCount) console.warn(`⚠️  ${rowCount} annonce(s) interrompue(s) marquée(s) en échec`);
};

// ─── Actions de l'admin ──────────────────────────────────────────────────────

const list = async ({ status } = {}) => {
  const statuses = String(status || "").split(",").filter((s) => ["scheduled", "sending", "sent", "cancelled", "failed"].includes(s));
  const { rows } = statuses.length
    ? await db.query(`${SELECT} WHERE a.status = ANY($1) ORDER BY a.scheduled_at DESC LIMIT 200`, [statuses])
    : await db.query(`${SELECT} ORDER BY a.scheduled_at DESC LIMIT 200`);
  const { rows: audience } = await db.query(
    `SELECT COUNT(*)::INT AS n FROM clients WHERE announcements_enabled = true AND is_active = true AND deleted_at IS NULL`
  );
  return { items: rows, audience: audience[0].n };
};

const create = async (adminId, body) => {
  const data = validate(body);
  const immediate = !data.scheduledAt;
  const { rows } = await db.query(
    `INSERT INTO announcements (title, body, link, scheduled_at, status, created_by)
     VALUES ($1, $2, $3, COALESCE($4::TIMESTAMPTZ, NOW()), $5, $6)
     RETURNING id, title, body, link, scheduled_at`,
    [data.title, data.body, data.link, data.scheduledAt, immediate ? "sending" : "scheduled", adminId]
  );
  if (immediate) await deliver(rows[0], adminId);
  else log(adminId, "announcement_scheduled", rows[0]);
  return findById(rows[0].id);
};

const update = async (adminId, id, body) => {
  const existing = await findById(id);
  if (!existing) throw new AnnouncementError(404, "Annonce introuvable");
  if (existing.status !== "scheduled") throw new AnnouncementError(409, "Seule une annonce programmée peut être modifiée");
  const data = validate({ ...existing, ...body, scheduled_at: body.scheduled_at ?? existing.scheduled_at });
  if (!data.scheduledAt) throw new AnnouncementError(400, "Choisissez une date future, ou utilisez « Envoyer maintenant »");
  const { rowCount } = await db.query(
    `UPDATE announcements SET title = $2, body = $3, link = $4, scheduled_at = $5
     WHERE id = $1 AND status = 'scheduled'`,
    [id, data.title, data.body, data.link, data.scheduledAt]
  );
  if (!rowCount) throw new AnnouncementError(409, "L'annonce vient d'être envoyée ou annulée");
  const updated = await findById(id);
  log(adminId, "announcement_updated", updated);
  return updated;
};

const sendNow = async (adminId, id) => {
  const { rows } = await db.query(
    `UPDATE announcements SET status = 'sending', scheduled_at = NOW()
     WHERE id = $1 AND status IN ('scheduled', 'failed')
     RETURNING id, title, body, link, scheduled_at`,
    [id]
  );
  if (!rows[0]) throw new AnnouncementError(409, "Cette annonce n'est plus en attente");
  await deliver(rows[0], adminId);
  return findById(id);
};

const cancel = async (adminId, id) => {
  const { rows } = await db.query(
    `UPDATE announcements SET status = 'cancelled' WHERE id = $1 AND status IN ('scheduled', 'failed') RETURNING id, title, scheduled_at`,
    [id]
  );
  if (!rows[0]) throw new AnnouncementError(409, "Seule une annonce en attente peut être annulée");
  log(adminId, "announcement_cancelled", rows[0]);
  return findById(id);
};

module.exports = { AnnouncementError, list, create, update, sendNow, cancel, dispatchDue, recoverStuck };
