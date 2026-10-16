// utils/profitScheduler.js
// Relevés automatiques des soldes à 00h00 et 23h59, heure de Nairobi (UTC+3).
// node-cron avec fuseau explicite : correct quel que soit le fuseau du serveur
// (Render est en UTC — avec setHours, les relevés étaient décalés de 3 h).
// À appeler une seule fois au démarrage du serveur : require('./utils/profitScheduler')
const cron = require("node-cron");
const db = require("../config/db");

const TIMEZONE = "Africa/Nairobi";

const takeSnapshot = async (type) => {
  try {
    await db.query(`SELECT take_balance_snapshot($1)`, [type]);
    console.log(`✅ Snapshot ${type} pris`);
  } catch (err) {
    console.error(`❌ Snapshot ${type} échoué:`, err.message);
  }
};

cron.schedule("0 0 * * *", () => takeSnapshot("start_of_day"), { timezone: TIMEZONE });
cron.schedule("59 23 * * *", () => takeSnapshot("end_of_day"), { timezone: TIMEZONE });
console.log(`🕐 Snapshots planifiés à 00:00 et 23:59 (${TIMEZONE})`);

// Démarrage : début de journée pris s'il manque (la date est celle de la base)
(async () => {
  try {
    const { rows } = await db.query(
      `SELECT 1 FROM balance_snapshots WHERE snapshot_type = 'start_of_day' AND snapshot_date = CURRENT_DATE`
    );
    if (rows.length === 0) {
      console.log("📸 Pas de snapshot start_of_day aujourd'hui, prise immédiate...");
      await takeSnapshot("start_of_day");
    }
  } catch (err) {
    console.error("❌ Vérification snapshot démarrage:", err.message);
  }
})();

module.exports = { takeSnapshot };
