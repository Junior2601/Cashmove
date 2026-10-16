// realtime/index.js — serveur Socket.IO (cahier V2 · §7, NOT-01, NOT-03, NOT-05)
//
// Rooms :
//   user:{id}     client connecté (ses statuts et notifications)
//   agent:{id}    agent (ses nouvelles transactions, réassignations)
//   staff         admins et semi-admins (tout)
//   trx:{ref}     suivi d'une référence par un invité (trx:subscribe)
//
// Les événements viennent de PostgreSQL (pg_notify, migration 002) : la base
// enregistre d'abord, ce module diffuse ensuite.
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const push = require("../services/push.service");
const staffNotify = require("../services/staffNotify.service");

const TX_DETAILS = `
  SELECT id, tracking_code, status, send_amount, receive_amount,
         from_currency_code, to_currency_code, from_country, to_country,
         sender_method, receiver_method, agent_id, agent_name, created_at
  FROM v_transaction_details WHERE id = $1`;

const CHANNEL = "movecash_events";
const MAX_TRACKED_REFS = 10;     // références suivies par connexion invitée
const REF_PATTERN = /^[A-Z0-9-]{6,30}$/;

let io = null;

// ─── Diffusion ───────────────────────────────────────────────────────────────

const unreadCount = async (clientId) => {
  const { rows } = await db.query(
    `SELECT COUNT(*)::INT AS n FROM notifications WHERE client_id = $1 AND read_at IS NULL`,
    [clientId]
  );
  return rows[0].n;
};

// Envoie notification:new aux appareils connectés du client
const emitNotification = async (notificationId) => {
  const { rows } = await db.query(
    `SELECT id, client_id, type, title, body, link, data, read_at, created_at
     FROM notifications WHERE id = $1`,
    [notificationId]
  );
  const n = rows[0];
  if (!n) return;
  const { client_id, ...notification } = n;
  io.to(`user:${client_id}`).emit("notification:new", {
    notification,
    unread_count: await unreadCount(client_id),
  });
  // Même information en push, pour quand l'app est fermée (NOT-02)
  push.sendNotification(client_id, n).catch((err) => console.error("❌ push:", err.message));
};

const handlers = {
  // Nouvelle transaction → back-office en direct (NOT-05)
  created: async (e) => {
    const { rows } = await db.query(TX_DETAILS, [e.transaction_id]);
    if (!rows[0]) return;
    let target = io.to("staff");
    if (e.assigned_agent_id) target = target.to(`agent:${e.assigned_agent_id}`);
    target.emit("transaction:created", rows[0]);
    // Push au personnel (remplace l'e-mail « nouvelle transaction »)
    staffNotify.transactionCreated(rows[0]);
  },

  // Changement de statut → client, suivi invité, back-office (NOT-01)
  status: async (e) => {
    const payload = {
      id: e.transaction_id,
      tracking_code: e.tracking_code,
      from_status: e.from_status,
      to_status: e.to_status,
      at: new Date().toISOString(),
    };
    let target = io.to(`trx:${e.tracking_code}`).to("staff");
    if (e.client_id) target = target.to(`user:${e.client_id}`);
    if (e.assigned_agent_id) target = target.to(`agent:${e.assigned_agent_id}`);
    target.emit("transaction:status", payload);

    if (e.notification_id) await emitNotification(e.notification_id);

    // Le client a payé : l'agent assigné doit maintenant traiter la transaction
    if (e.from_status === "en_attente" && e.to_status === "validee") {
      const { rows } = await db.query(TX_DETAILS, [e.transaction_id]);
      if (rows[0]) staffNotify.paymentConfirmed(rows[0]);
    }
  },

  // Redirection acceptée : l'ancien et le nouvel agent rafraîchissent leur liste
  assigned: async (e) => {
    let target = io.to("staff");
    if (e.from_agent_id) target = target.to(`agent:${e.from_agent_id}`);
    if (e.to_agent_id) target = target.to(`agent:${e.to_agent_id}`);
    target.emit("transaction:assigned", e);
  },

  // Nouveaux taux → tout le monde (rates:update)
  rates: async () => {
    const { rows } = await db.query(
      `SELECT r.id, r.from_currency_id, r.to_currency_id, r.rate,
              fc.code AS from_currency_code, tc.code AS to_currency_code
       FROM rates r
       JOIN currencies fc ON fc.id = r.from_currency_id AND fc.is_active = true
       JOIN currencies tc ON tc.id = r.to_currency_id AND tc.is_active = true
       WHERE r.is_active = true AND r.deleted_at IS NULL`
    );
    io.emit("rates:update", rows);
  },
};

const handleNotification = async (msg) => {
  if (msg.channel !== CHANNEL || !io) return;
  try {
    const event = JSON.parse(msg.payload);
    await handlers[event.kind]?.(event);
  } catch (err) {
    console.error("❌ realtime:", err.message);
  }
};

// ─── Écoute PostgreSQL (connexion dédiée, reconnexion automatique) ──────────

let listener = null;
let keepAlive = null;

const startListener = async (attempt = 1) => {
  try {
    const client = await db.pool.connect();
    listener = client;

    const restart = (err) => {
      if (listener !== client) return;
      console.warn("⚠️  realtime: écoute PostgreSQL perdue, reconnexion…", err?.message || "");
      listener = null;
      clearInterval(keepAlive);
      try { client.release(err || true); } catch (_) {}
      setTimeout(() => startListener(), 2000);
    };

    client.on("notification", handleNotification);
    client.on("error", restart);
    await client.query(`LISTEN ${CHANNEL}`);

    // Garde la connexion vivante et détecte une coupure silencieuse
    clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      client.query("SELECT 1").catch(restart);
    }, 4 * 60 * 1000);

    console.log("🔔 realtime: écoute PostgreSQL active");
  } catch (err) {
    const delay = Math.min(30000, 1000 * 2 ** attempt);
    console.warn(`⚠️  realtime: LISTEN impossible (${err.message}), nouvel essai dans ${delay / 1000}s`);
    setTimeout(() => startListener(attempt + 1), delay);
  }
};

// ─── Connexions Socket.IO ───────────────────────────────────────────────────

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Authentification par le jeton JWT (handshake.auth.token) ; sans jeton = invité
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.data.user = null;
      return next();
    }
    try {
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      const err = new Error("unauthorized");
      err.data = { code: "TOKEN_INVALID" };
      next(err);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    // Chacun ne rejoint que ses propres rooms (§11)
    if (user?.role === "client") socket.join(`user:${user.id}`);
    else if (user?.role === "agent") socket.join(`agent:${user.id}`);
    else if (user?.role === "admin" || user?.role === "semi-admin") socket.join("staff");

    // Suivi d'une référence sans compte (trx:subscribe)
    socket.on("trx:subscribe", async (ref, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const code = String(ref || "").trim().toUpperCase();
      const tracked = [...socket.rooms].filter((r) => r.startsWith("trx:"));
      if (!REF_PATTERN.test(code)) return reply({ ok: false, error: "INVALID_REF" });
      if (tracked.length >= MAX_TRACKED_REFS) return reply({ ok: false, error: "TOO_MANY" });
      try {
        const { rows } = await db.query(`SELECT status FROM transactions WHERE tracking_code = $1`, [code]);
        if (!rows[0]) return reply({ ok: false, error: "NOT_FOUND" });
        socket.join(`trx:${code}`);
        reply({ ok: true, status: rows[0].status });
      } catch {
        reply({ ok: false, error: "SERVER_ERROR" });
      }
    });

    socket.on("trx:unsubscribe", (ref) => {
      socket.leave(`trx:${String(ref || "").trim().toUpperCase()}`);
    });
  });

  startListener();
  return io;
};

// Annonces de l'admin (nouveaux pays, taux, promotions) aux clients qui les acceptent
// announcementId : annonce d'origine (table announcements), pour les statistiques de lecture
const broadcastAnnouncement = async ({ title, body, link, announcementId = null }) => {
  const { rows } = await db.query(
    `INSERT INTO notifications (client_id, type, title, body, link, announcement_id)
     SELECT id, 'announcement', $1, $2, $3, $4
     FROM clients
     WHERE announcements_enabled = true AND is_active = true AND deleted_at IS NULL
     RETURNING id, client_id, type, title, body, link, data, read_at, created_at`,
    [title, body || null, link || null, announcementId]
  );
  if (io && rows.length) {
    // Un seul calcul des non-lues pour tous les destinataires
    const counts = await db.query(
      `SELECT client_id, COUNT(*)::INT AS n FROM notifications
       WHERE client_id = ANY($1) AND read_at IS NULL GROUP BY client_id`,
      [rows.map((r) => r.client_id)]
    );
    const unread = Object.fromEntries(counts.rows.map((r) => [r.client_id, r.n]));
    for (const { client_id, ...notification } of rows) {
      io.to(`user:${client_id}`).emit("notification:new", { notification, unread_count: unread[client_id] || 0 });
    }
  }
  push.sendAnnouncement(rows).catch((err) => console.error("❌ push annonce:", err.message));
  return { recipients: rows.length };
};

module.exports = { init, broadcastAnnouncement, emitNotification };
