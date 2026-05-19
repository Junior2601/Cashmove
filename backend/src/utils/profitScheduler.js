// utils/profitScheduler.js
// Snapshots automatiques des balances à 00h00 et 23h58 (heure GMT+3)
// À appeler une seule fois au démarrage du serveur : require('./utils/profitScheduler')

const db = require("../config/db");

const takeSnapshot = async (type) => {
  try {
    await db.query(`SELECT take_balance_snapshot($1)`, [type]);
    console.log(`✅ Snapshot ${type} pris`);
  } catch (err) {
    console.error(`❌ Snapshot ${type} échoué:`, err.message);
  }
};

// Planifie une fonction à une heure précise (heure locale serveur)
// et la répète toutes les 24h
const scheduleDaily = (hour, minute, fn, label) => {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  // Si l'heure est déjà passée aujourd'hui, on planifie pour demain
  if (next <= now) next.setDate(next.getDate() + 1);

  const delay = next - now;
  console.log(`🕐 Snapshot "${label}" planifié dans ${Math.round(delay / 60000)} min`);

  setTimeout(() => {
    fn();
    // Répéter toutes les 24h
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, delay);
};

// 00h00 → snapshot start_of_day
scheduleDaily(0, 0, () => takeSnapshot("start_of_day"), "start_of_day");

// 23h58 → snapshot end_of_day
scheduleDaily(23, 58, () => takeSnapshot("end_of_day"), "end_of_day");

// Snapshot start_of_day immédiat au démarrage si pas encore pris aujourd'hui
(async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await db.query(
      `SELECT id FROM balance_snapshots WHERE snapshot_type = 'start_of_day' AND snapshot_date = $1`,
      [today]
    );
    if (existing.rows.length === 0) {
      console.log("📸 Pas de snapshot start_of_day aujourd'hui, prise immédiate...");
      await takeSnapshot("start_of_day");
    } else {
      console.log("✅ Snapshot start_of_day déjà existant pour aujourd'hui");
    }
  } catch (err) {
    console.error("❌ Vérification snapshot démarrage:", err.message);
  }
})();

module.exports = { takeSnapshot };