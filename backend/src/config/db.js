const { types } = require("pg");

// OID 1114 = TIMESTAMP, OID 1184 = TIMESTAMPTZ
types.setTypeParser(1114, (val) => val);
types.setTypeParser(1184, (val) => val);

const { Pool } = require("pg");
const { readDatabaseUrl, useSsl, withParams } = require("./dbUrl");

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_CONN_STRING = readDatabaseUrl();

const CONN_STRING = withParams(
  BASE_CONN_STRING,
  "keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5" +
    "&options=-c%20timezone%3DAfrica%2FNairobi"
);

const USE_SSL = useSsl(BASE_CONN_STRING);

const POOL_CONFIG = {
  connectionString: CONN_STRING,
  ssl: USE_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

// ─── Pool factory ─────────────────────────────────────────────────────────────

function createPool() {
  const p = new Pool(POOL_CONFIG);

  p.on("error", (err) => {
    console.error("❌ Pool idle client error:", err.message);
  });

  p.on("connect", (client) => {
    client.connection.stream.setKeepAlive(true, 10000);
    client.on("error", (err) => {
      console.error("❌ Client error:", err.message);
    });
  });

  return p;
}

// ─── Singleton pool ───────────────────────────────────────────────────────────

const state = { pool: createPool() };

function getPool() {
  return state.pool;
}

function recreatePool() {
  const old = state.pool;
  state.pool = createPool();
  old.end().catch((err) =>
    console.warn("⚠️  Erreur fermeture ancien pool:", err.message)
  );
}

// ─── Détection erreurs de connexion ──────────────────────────────────────────

const CONNECTION_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
]);

const CONNECTION_ERROR_MESSAGES = [
  "Connection terminated",
  "server closed the connection",
  "SSL connection has been closed unexpectedly",
];

function isConnectionError(err) {
  if (CONNECTION_ERROR_CODES.has(err.code)) return true;
  return CONNECTION_ERROR_MESSAGES.some((msg) => err.message?.includes(msg));
}

// ─── query ────────────────────────────────────────────────────────────────────

async function query(text, params) {
  try {
    return await getPool().query(text, params);
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn("⚠️  Connexion perdue, recréation du pool...");
      recreatePool();
      return await getPool().query(text, params);
    }
    throw err;
  }
}

// ─── getClient ────────────────────────────────────────────────────────────────
// Pour les transactions internes (BEGIN / COMMIT / ROLLBACK).

async function getClient(attempt = 1) {
  const MAX_ATTEMPTS = 3;
  const client = await getPool().connect();

  if (!client.listenerCount("error")) {
    client.on("error", (err) => {
      console.error("❌ getClient error:", err.message);
    });
  }

  try {
    await client.query("SET timezone = 'Africa/Nairobi'");
    await client.query("SET lock_timeout = '5000ms'");
    await client.query("SET statement_timeout = '30000ms'");
  } catch (err) {
    console.warn(
      `⚠️  Connexion dégradée (tentative ${attempt}/${MAX_ATTEMPTS}): ${err.message} — rejet et retry`
    );
    try { client.release(err); } catch (_) {}

    if (attempt < MAX_ATTEMPTS) {
      return getClient(attempt + 1);
    }
    throw new Error(
      `Impossible d'obtenir une connexion saine après ${MAX_ATTEMPTS} tentatives: ${err.message}`
    );
  }

  return client;
}

// ─── connect ──────────────────────────────────────────────────────────────────
// Méthode dédiée pour les services qui appellent db.connect() directement
// (ex: agent_service.js). Retourne un client pg standard avec .query() et
// .release() — utilisable pour BEGIN / COMMIT / ROLLBACK.

async function connect() {
  const client = await getPool().connect();

  if (!client.listenerCount("error")) {
    client.on("error", (err) => {
      console.error("❌ connect() client error:", err.message);
    });
  }

  try {
    await client.query("SET timezone = 'Africa/Nairobi'");
    await client.query("SET lock_timeout = '5000ms'");
    await client.query("SET statement_timeout = '30000ms'");
  } catch (err) {
    try { client.release(err); } catch (_) {}
    throw new Error("Impossible d'initialiser la connexion : " + err.message);
  }

  return client;
}

// ─── Connexion initiale ───────────────────────────────────────────────────────

async function connectWithRetry(attempt = 1, max = 5) {
  try {
    const client = await getPool().connect();
    console.log("✅ PostgreSQL connecté");
    client.release();
  } catch (err) {
    console.error(`❌ Tentative ${attempt}/${max}:`, err.message);
    if (attempt < max) {
      setTimeout(() => connectWithRetry(attempt + 1, max), 3000);
    } else {
      console.error("💀 Nombre max de tentatives atteint.");
    }
  }
}

connectWithRetry();

// ─── Ping toutes les 4 minutes ────────────────────────────────────────────────

setInterval(async () => {
  try {
    await query("SELECT 1");
    console.log("🏓 DB ping OK");
  } catch (err) {
    console.warn("⚠️  Ping échoué, recréation du pool:", err.message);
    recreatePool();
  }
}, 4 * 60 * 1000);

// ─── Killer de transactions idle-in-transaction ───────────────────────────────

setInterval(async () => {
  try {
    const result = await query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE state = 'idle in transaction'
        AND state_change < NOW() - INTERVAL '45 seconds'
        AND pid <> pg_backend_pid()
    `);
    if (result.rowCount > 0) {
      console.warn(`⚠️  ${result.rowCount} transaction(s) idle-in-transaction terminée(s)`);
    }
  } catch (err) {
    console.warn("⚠️  Killer idle-in-transaction échoué:", err.message);
  }
}, 30 * 1000);

// ─── Gestion erreurs globales ─────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  if (isConnectionError(err)) {
    console.error("⚠️  Erreur DB non catchée (handled):", err.message);
    recreatePool();
  } else {
    console.error("💀 Exception fatale:", err);
    process.exit(1);
  }
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  query,
  getClient,
  connect,
  get pool() {
    return getPool();
  },
};
