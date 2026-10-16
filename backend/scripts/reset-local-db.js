// scripts/reset-local-db.js — (re)crée la base LOCALE de test
//
//   npm run db:reset-local -- --yes
//
// 1. Vide le schéma public (toutes les données locales sont perdues)
// 2. Applique src/config/db.sql puis src/config/migrations/*.sql dans l'ordre
// 3. Insère les données de test (src/config/seeds/dev_seed.sql)
//
// Refuse de s'exécuter si DATABASE_URL ne pointe pas vers localhost.
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Client } = require("pg");
const bcrypt = require("bcrypt");

const STAFF_PASSWORD = "MoveCash2026!";
const CONFIG = path.join(__dirname, "..", "src", "config");

const url = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error("❌ DATABASE_URL ne pointe pas vers localhost : refus (ce script efface la base).");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(`⚠️  Ce script EFFACE la base locale ${url.replace(/:[^:@/]+@/, ":***@")}`);
  console.error("   Relancez avec : npm run db:reset-local -- --yes");
  process.exit(1);
}

const run = async () => {
  const client = new Client({ connectionString: url, ssl: false });
  await client.connect();
  await client.query("SET client_min_messages = warning");

  console.log("🧹 Schéma public vidé");
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

  console.log("🏗️  db.sql");
  await client.query(fs.readFileSync(path.join(CONFIG, "db.sql"), "utf8"));

  const migrations = fs
    .readdirSync(path.join(CONFIG, "migrations"))
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();
  for (const file of migrations) {
    console.log(`🔧 migrations/${file}`);
    await client.query(fs.readFileSync(path.join(CONFIG, "migrations", file), "utf8"));
  }

  console.log("🌱 Données de test");
  const hash = await bcrypt.hash(STAFF_PASSWORD, 10);
  const seed = fs.readFileSync(path.join(CONFIG, "seeds", "dev_seed.sql"), "utf8").replaceAll("__STAFF_PASSWORD_HASH__", hash);
  await client.query(seed);

  await client.end();

  console.log(`
✅ Base locale prête.

Back-office (mot de passe : ${STAFF_PASSWORD}) — http://localhost:5173/login
   admin@movecash.local      admin
   semi@movecash.local       semi-admin
   agent.ru@movecash.local   agent Russie (reçoit les envois Sberbank / Tinkoff)
   agent.ci@movecash.local   agent Côte d'Ivoire (reçoit les envois Orange Money / Wave)

Client — http://localhost:5173/connexion
   N'importe quel e-mail ; le code à 6 chiffres s'affiche aussi dans la console du backend.
`);
};

run().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
