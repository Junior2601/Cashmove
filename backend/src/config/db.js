const { Pool } = require("pg");

const BASE_CONN_STRING =
  process.env.DATABASE_URL ||
  "postgresql://paullan:Op5RfNTEAxtBK5KJyP7SUP7okYW1MWGO@dpg-d71d4fh5pdvs73c668b0-a.frankfurt-postgres.render.com/majmovecash";

const CONN_STRING =
  BASE_CONN_STRING +
  "?keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5";

const poolConfig = {
  connectionString: CONN_STRING,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  query_timeout: 30000,
};

function createPool() {
  const p = new Pool(poolConfig);

  p.on("error", (err) => {
    console.error("❌ Pool idle client error (handled):", err.message);
  });

  p.on("connect", (client) => {
    client.connection.stream.setKeepAlive(true, 10000);

    client.on("error", (err) => {
      console.error("❌ Client error (handled):", err.message);
    });

    // NE PAS faire de query dans readyForQuery — ça peut interférer avec
    // les transactions en cours sur la même connexion physique.
    // Les timeouts sont appliqués dans getClient() après checkout.
  });

  return p;
}

let pool = createPool();

process.on("uncaughtException", (err) => {
  if (
    err.code === "ETIMEDOUT" ||
    err.code === "ECONNRESET" ||
    err.code === "ECONNREFUSED"
  ) {
    console.error("⚠️  Uncaught DB connection error (handled):", err.message);
    pool = createPool();
  } else {
    console.error("💀 Uncaught exception (fatal):", err);
    process.exit(1);
  }
});

async function connectWithRetry(attempt = 1, max = 5) {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected");
    client.release();
  } catch (err) {
    console.error(`❌ Attempt ${attempt}/${max}:`, err.message);
    if (attempt < max) {
      setTimeout(() => connectWithRetry(attempt + 1, max), 3000);
    } else {
      console.error("💀 Max retries reached.");
    }
  }
}

connectWithRetry();

// Ping toutes les 4 minutes pour garder les connexions vivantes
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("🏓 DB ping OK");
  } catch (err) {
    console.warn("⚠️  Ping failed, recreating pool:", err.message);
    pool = createPool();
  }
}, 4 * 60 * 1000);

// Killer de transactions idle-in-transaction
// Une transaction zombie (idle in transaction) tient des row-locks et bloque
// toutes les requêtes concurrentes sur les mêmes lignes indéfiniment.
// On les termine toutes les 30s si elles sont idle depuis plus de 45s.
setInterval(async () => {
  try {
    const result = await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE state = 'idle in transaction'
        AND state_change < NOW() - INTERVAL '45 seconds'
        AND pid <> pg_backend_pid()
    `);
    if (result.rowCount > 0) {
      console.warn(`⚠️  ${result.rowCount} transaction(s) idle-in-transaction terminée(s)`);
    }
  } catch (e) {
    // pg_terminate_backend peut nécessiter les droits superuser.
    // Sur Render, ça fonctionne car on est owner de la DB.
    console.warn("⚠️  Killer idle-in-transaction échoué:", e.message);
  }
}, 30 * 1000);

const CONNECTION_ERRORS = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "Connection terminated",
  "server closed the connection",
  "SSL connection has been closed unexpectedly",
];

function isConnectionError(err) {
  return CONNECTION_ERRORS.some(
    (msg) => err.message?.includes(msg) || err.code === msg
  );
}

pool.query = new Proxy(pool.query.bind(pool), {
  apply: async (target, thisArg, args) => {
    try {
      return await target(...args);
    } catch (err) {
      if (isConnectionError(err)) {
        console.warn("⚠️  Connection lost, recreating pool...");
        pool = createPool();
        return await pool.query(...args);
      }
      throw err;
    }
  },
});

// ─── getClient ────────────────────────────────────────────────────────────────
pool.getClient = async (attempt = 1) => {
  const client = await pool.connect();

  if (!client.listenerCount("error")) {
    client.on("error", (err) => {
      console.error("❌ getClient error (handled):", err.message);
    });
  }

  // Appliquer timezone + timeouts sur ce client après checkout.
  // lock_timeout = 5s  : si un FOR UPDATE attend un lock > 5s → erreur propre
  //                      plutôt que hang infini.
  // statement_timeout = 30s : filet de sécurité global.
  //
  // Si les SET échouent (connexion dégradée "Query read timeout"), on rejette
  // cette connexion avec destroyClient() et on en demande une nouvelle.
  // On essaie au max 3 fois avant de lancer l'erreur.
  try {
    await client.query("SET timezone = 'Etc/GMT-3'");
    await client.query("SET lock_timeout = '5000ms'");
    await client.query("SET statement_timeout = '30000ms'");
  } catch (e) {
    console.warn(`⚠️  Connexion dégradée (tentative ${attempt}/3): ${e.message} — rejet et retry`);
    // destroyClient détruit la connexion physique et la retire du pool
    // au lieu de la remettre en circulation dans un état corrompu.
    try { client.release(e); } catch (_) {}
    if (attempt < 3) {
      return pool.getClient(attempt + 1);
    }
    throw new Error(`Impossible d'obtenir une connexion saine après 3 tentatives: ${e.message}`);
  }

  const originalRelease = client.release.bind(client);

  // release() synchrone — chaque service gère son propre COMMIT/ROLLBACK.
  client.release = (err) => {
    originalRelease(err);
  };

  return client;
};

module.exports = pool;