// controllers/profit.controller.js
const {
  takeSnapshotService,
  getProfitService,
  getCurrentBalancesService,
} = require("../services/profit.service");

// GET /api/profit?period=day&date=2026-05-19
const getProfit = async (req, res) => {
  try {
    const { period = "day", date } = req.query;
    const data = await getProfitService(period, date);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/profit/current — valeur actuelle des balances en temps réel
const getCurrentBalances = async (req, res) => {
  try {
    const data = await getCurrentBalancesService();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/profit/snapshot — forcer un snapshot manuellement
const takeSnapshot = async (req, res) => {
  try {
    const { type } = req.body;
    const data = await takeSnapshotService(type);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getProfit, getCurrentBalances, takeSnapshot };