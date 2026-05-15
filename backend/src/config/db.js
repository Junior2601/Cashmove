const { Pool } = require("pg");

const BASE_CONN_STRING =
  process.env.DATABASE_URL ||
  "postgresql://paullan:Op5RfNTEAxtBK5KJyP7SUP7okYW1MWGO@dpg-d71d4fh5pdvs73c668b0-a.frankfurt-postgres.render.com/majmovecash";

// ✅ Keep-alive PostgreSQL natif via la connection string
const CONN_STRING =
  BASE_CONN_STRING +
  "?keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5";

const poolConfig = {
  connectionString: CONN_STRING,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

function createPool() {
  const p = new Pool(poolConfig);

  // ✅ Erreurs du Pool (connexions idle)
  p.on("error", (err) => {
    console.error("❌ Pool idle client error (handled):", err.message);
  });

  p.on("connect", (client) => {
    // ✅ Keep-alive TCP en complément
    client.connection.stream.setKeepAlive(true, 10000);

    // ✅ Erreurs du Client individuel
    client.on("error", (err) => {
      console.error("❌ Client error (handled):", err.message);
    });

    // ✅ Timezone GMT+3 sans conflit de query
    client.connection.once("readyForQuery", () => {
      client.query("SET timezone = 'Etc/GMT-3'").catch(console.error);
    });
  });

  return p;
}

let pool = createPool();

// ✅ Filet de sécurité global
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

// ─── Retry au démarrage ──────────────────────────────────────────────────────
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

// ─── Ping toutes les 4min pour garder la connexion vivante ──────────────────
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("🏓 DB ping OK");
  } catch (err) {
    console.warn("⚠️  Ping failed, recreating pool:", err.message);
    pool = createPool();
  }
}, 4 * 60 * 1000);

// ─── Détection des erreurs de connexion ─────────────────────────────────────
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

// ─── Query wrapper avec reconnexion automatique ──────────────────────────────
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

// ─── getClient avec listener error garanti ──────────────────────────────────
pool.getClient = async () => {
  const client = await pool.connect();
  if (!client.listenerCount("error")) {
    client.on("error", (err) => {
      console.error("❌ getClient error (handled):", err.message);
    });
  }
  return client;
};

module.exports = pool;