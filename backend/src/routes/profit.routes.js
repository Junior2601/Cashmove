// routes/profit.routes.js
const router = require("express").Router();
const {
  getProfit,
  getProfitHistory,
  getCurrentBalances,
  takeSnapshot,
} = require("../controllers/profit.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Toutes les routes profit sont réservées aux admins et semi-admins
router.use(verifyToken, authorizeRoles("admin", "semi-admin"));

// ─── Lecture ──────────────────────────────────────────────────────────────────

// GET /api/profit?period=day|week|month&date=YYYY-MM-DD
// Profit normalisé sur une période donnée
router.get("/", getProfit);

// GET /api/profit/history?limit=30
// Historique des N derniers jours + résumé statistique (win rate, best/worst day…)
// ⚠️ Doit être AVANT /:id ou toute route dynamique
router.get("/history", getProfitHistory);

// GET /api/profit/current
// Balances en temps réel + profit non réalisé du jour vs snapshot start_of_day
router.get("/current", getCurrentBalances);

// ─── Écriture (admin uniquement) ─────────────────────────────────────────────

// POST /api/profit/snapshot   { "type": "start_of_day" | "end_of_day" }
router.post("/snapshot", authorizeRoles("admin"), takeSnapshot);

module.exports = router;