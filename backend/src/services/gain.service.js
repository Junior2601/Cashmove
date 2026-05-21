const GainModel = require("../models/gain.model");

const GainService = {
  // Récupérer tous les gains (admin)
  async getAllGains(filters = {}) {
    const { agentId, currencyId, startDate, endDate, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const gains = await GainModel.findAll({
      agentId,
      currencyId,
      startDate,
      endDate,
      limit,
      offset,
    });

    return {
      gains,
      pagination: { page, limit, offset },
    };
  },

  // Gains d'un agent spécifique (admin ou agent lui-même)
  async getGainsByAgent(agentId, requesterId, requesterRole) {
    if (requesterRole === "agent" && requesterId !== agentId) {
      throw new Error("FORBIDDEN: Vous ne pouvez voir que vos propres gains");
    }

    const gains = await GainModel.findAll({ agentId });
    return gains;
  },

  // Gains d'un agent regroupés par devise
  async getGainsGroupedByCurrency(agentId) {
    const grouped = await GainModel.findByAgentGroupedByCurrency(agentId);
    return grouped;
  },

  // Gains mensuels d'un agent par devise
  async getMonthlyGainsByAgent(agentId) {
    const monthly = await GainModel.findMonthlyByAgentAndCurrency(agentId);
    return monthly;
  },

  // Gains détaillés d'un agent avec infos devises
  async getDetailedGainsByAgent(agentId, page = 1, limit = 50) {
    const detailed = await GainModel.findDetailedByAgent(agentId, limit, (page - 1) * limit);
    return {
      gains: detailed,
      pagination: { page, limit },
    };
  },

  // Total du mois en cours pour un agent et une devise
  async getCurrentMonthTotal(agentId, currencyId, requesterId, requesterRole) {
    if (requesterRole === "agent" && requesterId !== agentId) {
      throw new Error("FORBIDDEN: Vous ne pouvez voir que vos propres gains");
    }
    const total = await GainModel.getCurrentMonthTotal(agentId, currencyId);
    return { agentId, currencyId, total };
  },

  // Résumé global du mois en cours
  async getGlobalCurrentMonthSummary() {
    const summary = await GainModel.getCurrentMonthSummary();
    const totalAllCurrencies = summary.reduce((acc, curr) => acc + parseFloat(curr.total_gain), 0);
    return {
      total_all_currencies: totalAllCurrencies,
      by_currency: summary,
    };
  },

  // Historique des gains sur 12 mois
  async getMonthlyHistory() {
    const history = await GainModel.getMonthlyHistory();
    return history;
  },
};

module.exports = GainService;