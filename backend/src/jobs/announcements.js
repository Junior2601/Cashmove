// jobs/announcements.js — envoi des annonces programmées (chaque minute)
const cron = require("node-cron");
const Announcements = require("../services/announcement.service");

let isRunning = false;   // empêche deux exécutions simultanées sur ce serveur

const startAnnouncementJob = () => {
  Announcements.recoverStuck().catch((e) => console.error("❌ annonces (reprise):", e.message));

  cron.schedule("* * * * *", async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const sent = await Announcements.dispatchDue();
      if (sent) console.log(`📣 ${sent} annonce(s) programmée(s) envoyée(s)`);
    } catch (err) {
      console.error("❌ Job annonces:", err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("✅ Announcement job started");
};

module.exports = { startAnnouncementJob };
