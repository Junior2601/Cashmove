// controllers/profit.controller.js
const {
  takeSnapshotService,
  getProfitService,
  getProfitHistoryService,
  getCurrentBalancesService,
} = require("../services/profit.service");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profit?period=day|week|month&date=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────
const getProfit = async (req, res) => {
  try {
    const { period = "day", date } = req.query;
    const data = await getProfitService(period, date);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes("invalide") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profit/history?limit=30
// Retourne l'historique des N derniers jours + résumé statistique
// ─────────────────────────────────────────────────────────────────────────────
const getProfitHistory = async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const data = await getProfitHistoryService(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profit/current
// Balances en temps réel + profit non réalisé du jour
// ─────────────────────────────────────────────────────────────────────────────
const getCurrentBalances = async (req, res) => {
  try {
    const data = await getCurrentBalancesService();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/profit/snapshot   { "type": "start_of_day" | "end_of_day" }
// ─────────────────────────────────────────────────────────────────────────────
const takeSnapshot = async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Le champ 'type' est requis : start_of_day ou end_of_day",
      });
    }
    const data = await takeSnapshotService(type);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes("invalide") ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DANS profit.controller.js — ajouter :
// ─────────────────────────────────────────────────────────────────────────────
 
// GET /api/profit/transactions?date=YYYY-MM-DD&limit=50
const getTransactionProfits = async (req, res) => {
  try {
    const { date, limit = 50 } = req.query;
    const data = await getTransactionProfitsService({ date, limit });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { 
  getProfit,
  getProfitHistory,
  getCurrentBalances,
  takeSnapshot,
  getTransactionProfits
};