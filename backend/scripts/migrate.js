// scripts/migrate.js — migrations de la base (locale ou production)
//
//   npm run db:check                  inspection seule, rien n'est modifié
//   npm run db:migrate                applique les migrations en attente (demande confirmation)
//   npm run db:migrate -- --sync-functions
//                                     réapplique aussi les fonctions SQL de db.sql
//                                     (si l'inspection signale une fonction absente ou ancienne)
//
// Base visée : DATABASE_URL (variable d'environnement ou backend/.env).
// Pour la production : copier l'« External Database URL » de Render, ex.
//   DATABASE_URL="postgresql://...render.com/..." npm run db:check
//
// Chaque migration (src/config/migrations/NNN_*.sql) est idempotente et s'exécute
// dans sa propre transaction ; celles déjà passées sont notées dans schema_migrations.
const path = require("path");
const fs = require("fs");
const readline = require("readline");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Client } = require("pg");

const CONFIG = path.join(__dirname, "..", "src", "config");
const MIGRATIONS = path.join(CONFIG, "migrations");
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SYNC = args.includes("--sync-functions");
const YES = args.includes("--yes");

const url = process.env.DATABASE_URL || "";
if (!url) {
  console.error("❌ DATABASE_URL manquante");
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
const shown = url.replace(/:[^:@/]+@/, ":***@");

// Ce que l'application et les migrations supposent déjà présent (schéma de db.sql)
const REQUIRED = {
  tables: [
    "admins", "semi_admins", "currencies", "countries", "agents", "payment_methods", "balances",
    "balance_transactions", "balance_snapshots", "authorized_numbers", "rates", "transactions",
    "gains", "redirections", "history",
  ],
  columns: [
    ["transactions", "withdrawal_fee_amount"], ["transactions", "net_send_amount"],
    ["transactions", "sending_fee_amount"], ["transactions", "total_debit_amount"],
    ["payment_methods", "withdrawal_fee_percent"], ["payment_methods", "sending_fee_percent"],
  ],
  functions: [
    "update_updated_at_column", "generate_tracking_code", "compute_transfer_amounts", "compute_sending_fee",
    "create_transaction", "create_agent_transaction", "validate_transaction_by_client", "finalize_transaction",
    "create_redirection", "accept_redirection", "reject_redirection", "take_balance_snapshot",
  ],
};

// Repère d'une migration déjà passée (bases migrées à la main, avant ce script)
const MARKERS = {
  "001_v2_clients.sql": `SELECT to_regclass('public.clients') IS NOT NULL`,
  "002_v2_realtime.sql": `SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_rates_changed')`,
  "003_v2_pin_lock.sql": `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'pin_failed_attempts')`,
  "004_v2_announcements.sql": `SELECT to_regclass('public.announcements') IS NOT NULL`,
  "005_staff_push.sql": `SELECT to_regclass('public.staff_push_subscriptions') IS NOT NULL`,
  "006_profit_rules.sql": `SELECT to_regclass('public.transaction_profits') IS NOT NULL`,
  "007_notification_settings.sql": `SELECT to_regclass('public.staff_notification_settings') IS NOT NULL`,
};

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      resolve(a.trim());
    });
  });

// Fonctions de db.sql : blocs « CREATE OR REPLACE FUNCTION … $$; ».
// Celles que redéfinit une migration sont exclues : la version de la migration est plus récente.
const dbSqlFunctions = () => {
  const names = (sql) => [...sql.matchAll(/CREATE OR REPLACE FUNCTION\s+(\w+)/g)].map((m) => m[1]);
  const fromMigrations = new Set(
    fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))
      .flatMap((f) => names(fs.readFileSync(path.join(MIGRATIONS, f), "utf8")))
  );
  const sql = fs.readFileSync(path.join(CONFIG, "db.sql"), "utf8");
  const blocks = sql.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/g) || [];
  return blocks
    .map((b) => ({ name: b.match(/FUNCTION\s+(\w+)/)[1], sql: b }))
    .filter((b) => !fromMigrations.has(b.name));
};

const run = async () => {
  const client = new Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();
  await client.query("SET client_min_messages = warning");
  await client.query("SET timezone = 'Africa/Nairobi'");

  console.log(`\n🔎 Base : ${shown}${isLocal ? " (locale)" : " (DISTANTE)"}\n`);

  // ── 1. Inspection
  const problems = [];
  const { rows: tables } = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const tableSet = new Set(tables.map((t) => t.table_name));
  const missingTables = REQUIRED.tables.filter((t) => !tableSet.has(t));
  if (missingTables.length) problems.push(`Tables absentes : ${missingTables.join(", ")}`);

  for (const [table, column] of REQUIRED.columns) {
    if (!tableSet.has(table)) continue;
    const { rowCount } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (!rowCount) problems.push(`Colonne absente : ${table}.${column}`);
  }

  const { rows: fnRows } = await client.query(
    `SELECT p.proname, pg_get_functiondef(p.oid) AS def
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind = 'f'`
  );
  const fns = new Map(fnRows.map((f) => [f.proname, f.def]));
  const missingFns = REQUIRED.functions.filter((f) => !fns.has(f));
  const outdatedFns = [];
  // Ancienne version (fin de l'ancien db.sql) : n'écrit pas total_debit_amount → insertion refusée
  if (fns.has("create_agent_transaction") && !/total_debit_amount/.test(fns.get("create_agent_transaction"))) {
    outdatedFns.push("create_agent_transaction (ancienne version : la création par un agent échoue)");
  }
  if (missingFns.length) problems.push(`Fonctions absentes : ${missingFns.join(", ")}`);
  if (outdatedFns.length) problems.push(`Fonctions anciennes : ${outdatedFns.join(", ")}`);

  const counts = await client.query(
    `SELECT (SELECT COUNT(*) FROM transactions)::INT AS tx,
            (SELECT COUNT(*) FROM agents)::INT AS agents` + (tableSet.has("clients") ? `, (SELECT COUNT(*) FROM clients)::INT AS clients` : "")
  ).catch(() => ({ rows: [{}] }));
  console.log(`   Données : ${counts.rows[0].tx ?? "?"} transactions, ${counts.rows[0].agents ?? "?"} agents${counts.rows[0].clients !== undefined ? `, ${counts.rows[0].clients} clients` : ""}`);

  // ── 2. Migrations déjà passées / en attente (lecture seule en mode inspection)
  const { rows: done } = tableSet.has("schema_migrations")
    ? await client.query(`SELECT name FROM schema_migrations`)
    : { rows: [] };
  const applied = new Set(done.map((r) => r.name));
  const recorded = [];   // migrations repérées comme déjà passées, à noter lors de l'application
  const files = fs.readdirSync(MIGRATIONS).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  const pending = [];
  for (const f of files) {
    let already = applied.has(f);
    if (!already && MARKERS[f]) {
      const { rows } = await client.query(MARKERS[f]).catch(() => ({ rows: [{}] }));
      already = Object.values(rows[0])[0] === true;
      if (already) recorded.push(f);
    }
    console.log(`   ${already ? "✅" : "⏳"} ${f}${already ? "" : "  (en attente)"}`);
    if (!already) pending.push(f);
  }

  console.log("");
  if (problems.length) {
    console.log("⚠️  Écarts avec le schéma attendu :");
    problems.forEach((p) => console.log(`   - ${p}`));
    const onlyFunctions = !missingTables.length && !problems.some((p) => p.startsWith("Colonne"));
    if (onlyFunctions && !SYNC) {
      console.log("   → Corrigeable en relançant avec --sync-functions (réapplique les fonctions de db.sql).");
    } else if (!onlyFunctions) {
      console.log("   → Tables ou colonnes manquantes : la base n'a pas le schéma de db.sql. Ne pas migrer, demander de l'aide.");
    }
    console.log("");
  } else {
    console.log("✅ Schéma de base conforme.\n");
  }

  if (!APPLY) {
    console.log(pending.length ? `ℹ️  ${pending.length} migration(s) en attente. Pour appliquer : npm run db:migrate` : "ℹ️  Aucune migration en attente.");
    await client.end();
    return;
  }

  // ── 3. Application
  const blocking = missingTables.length || problems.some((p) => p.startsWith("Colonne"));
  if (blocking) {
    console.error("❌ Arrêt : schéma de base incomplet (voir ci-dessus). Rien n'a été modifié.");
    await client.end();
    process.exit(1);
  }
  if ((missingFns.length || outdatedFns.length) && !SYNC) {
    console.error("❌ Arrêt : fonctions absentes ou anciennes. Relancez avec --sync-functions. Rien n'a été modifié.");
    await client.end();
    process.exit(1);
  }
  if (!pending.length && !SYNC) {
    console.log("Rien à faire.");
    await client.end();
    return;
  }
  if (!YES) {
    const answer = await ask(`Appliquer ${SYNC ? "les fonctions de db.sql + " : ""}${pending.length} migration(s) sur ${isLocal ? "la base LOCALE" : "la base DISTANTE"} ? Tapez « oui » : `);
    if (answer.toLowerCase() !== "oui") {
      console.log("Annulé, rien n'a été modifié.");
      await client.end();
      return;
    }
  }

  // Rien n'est écrit avant ce point (inspection, refus, annulation)
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  for (const f of recorded) {
    await client.query(`INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, [f]);
  }

  if (SYNC) {
    const blocks = dbSqlFunctions();
    console.log(`🔧 Fonctions de db.sql (${blocks.length})`);
    await client.query("BEGIN");
    try {
      for (const b of blocks) await client.query(b.sql);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`fonctions de db.sql : ${err.message} (rien n'a été modifié)`);
    }
  }

  for (const f of pending) {
    console.log(`🔧 ${f}`);
    // Chaque fichier contient son propre BEGIN … COMMIT
    await client.query(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
    await client.query(`INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, [f]);
  }
  console.log("\n✅ Migrations appliquées.");
  await client.end();
};

run().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
