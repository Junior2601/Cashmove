const GainService = require("../services/gain.service");

const GainController = {
  // GET /api/gains
  async getAllGains(req, res) {
    try {
      const { agent_id, currency_id, start_date, end_date, page, limit } = req.query;
      const filters = {
        agentId: agent_id,
        currencyId: currency_id,
        startDate: start_date,
        endDate: end_date,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
      };
      const result = await GainService.getAllGains(filters);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/agent/:agentId
  async getGainsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      const requesterId = req.user.id;
      const requesterRole = req.user.role;
      const gains = await GainService.getGainsByAgent(parseInt(agentId), requesterId, requesterRole);
      res.json({ success: true, data: gains });
    } catch (error) {
      if (error.message.includes("FORBIDDEN")) {
        return res.status(403).json({ success: false, message: error.message });
      }
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/agent/:agentId/grouped-by-currency
  async getGainsGroupedByCurrency(req, res) {
    try {
      const { agentId } = req.params;
      const grouped = await GainService.getGainsGroupedByCurrency(parseInt(agentId));
      res.json({ success: true, data: grouped });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/agent/:agentId/monthly
  async getMonthlyGainsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      const monthly = await GainService.getMonthlyGainsByAgent(parseInt(agentId));
      res.json({ success: true, data: monthly });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/agent/:agentId/detailed
  async getDetailedGainsByAgent(req, res) {
    try {
      const { agentId } = req.params;
      const { page, limit } = req.query;
      const detailed = await GainService.getDetailedGainsByAgent(
        parseInt(agentId),
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 50
      );
      res.json({ success: true, data: detailed });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/agent/:agentId/current-month/:currencyCode
  async getCurrentMonthTotal(req, res) {
    try {
      const { agentId, currencyCode } = req.params;
      const requesterId = req.user.id;
      const requesterRole = req.user.role;

      // Récupérer currency_id depuis le code
      const pool = require("../db");
      const currencyResult = await pool.query(`SELECT id FROM currencies WHERE code = $1`, [currencyCode]);
      if (currencyResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Devise non trouvée" });
      }
      const currencyId = currencyResult.rows[0].id;

      const total = await GainService.getCurrentMonthTotal(
        parseInt(agentId),
        currencyId,
        requesterId,
        requesterRole
      );
      res.json({ success: true, data: total });
    } catch (error) {
      if (error.message.includes("FORBIDDEN")) {
        return res.status(403).json({ success: false, message: error.message });
      }
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/summary/current-month
  async getGlobalCurrentMonthSummary(req, res) {
    try {
      const summary = await GainService.getGlobalCurrentMonthSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/gains/history/monthly
  async getMonthlyHistory(req, res) {
    try {
      const history = await GainService.getMonthlyHistory();
      res.json({ success: true, data: history });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = GainController;