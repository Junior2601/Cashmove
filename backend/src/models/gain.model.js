const pool = require("../config/db");

const GainModel = {
  // Récupérer tous les gains (avec filtres optionnels)
  async findAll({ agentId, currencyId, startDate, endDate, limit, offset }) {
    let query = `
      SELECT 
        g.id,
        g.gain_amount,
        g.commission_percent_applied,
        g.created_at,
        t.id as transaction_id,
        t.tracking_code,
        a.id as agent_id,
        a.name as agent_name,
        c.code as currency_code,
        c.symbol as currency_symbol
      FROM gains g
      JOIN transactions t ON g.transaction_id = t.id
      JOIN agents a ON g.agent_id = a.id
      JOIN currencies c ON g.currency_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (agentId) {
      query += ` AND g.agent_id = $${paramIndex++}`;
      params.push(agentId);
    }
    if (currencyId) {
      query += ` AND g.currency_id = $${paramIndex++}`;
      params.push(currencyId);
    }
    if (startDate) {
      query += ` AND g.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND g.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY g.created_at DESC`;

    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }
    if (offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Trouver gains d'un agent par devise (groupé)
  async findByAgentGroupedByCurrency(agentId) {
    const query = `
      SELECT 
        c.id as currency_id,
        c.code,
        c.symbol,
        SUM(g.gain_amount) as total_gain,
        COUNT(g.id) as transaction_count
      FROM gains g
      JOIN currencies c ON g.currency_id = c.id
      WHERE g.agent_id = $1
      GROUP BY c.id, c.code, c.symbol
      ORDER BY total_gain DESC
    `;
    const result = await pool.query(query, [agentId]);
    return result.rows;
  },

  // Gains mensuels d'un agent par devise (derniers 12 mois)
  async findMonthlyByAgentAndCurrency(agentId) {
    const query = `
      SELECT 
        DATE_TRUNC('month', g.created_at) as month,
        c.id as currency_id,
        c.code,
        c.symbol,
        SUM(g.gain_amount) as total_gain,
        COUNT(g.id) as transaction_count
      FROM gains g
      JOIN currencies c ON g.currency_id = c.id
      WHERE g.agent_id = $1
        AND g.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month, c.id, c.code, c.symbol
      ORDER BY month DESC, total_gain DESC
    `;
    const result = await pool.query(query, [agentId]);
    return result.rows;
  },

  // Total du mois en cours pour un agent et une devise spécifiques
  async getCurrentMonthTotal(agentId, currencyId) {
    const query = `
      SELECT 
        COALESCE(SUM(g.gain_amount), 0) as total
      FROM gains g
      WHERE g.agent_id = $1
        AND g.currency_id = $2
        AND DATE_TRUNC('month', g.created_at) = DATE_TRUNC('month', NOW())
    `;
    const result = await pool.query(query, [agentId, currencyId]);
    return parseFloat(result.rows[0].total);
  },

  // Résumé global du mois en cours (tous agents)
  async getCurrentMonthSummary() {
    const query = `
      SELECT 
        c.id as currency_id,
        c.code,
        c.symbol,
        SUM(g.gain_amount) as total_gain,
        COUNT(DISTINCT g.agent_id) as agents_count,
        COUNT(g.id) as transaction_count
      FROM gains g
      JOIN currencies c ON g.currency_id = c.id
      WHERE DATE_TRUNC('month', g.created_at) = DATE_TRUNC('month', NOW())
      GROUP BY c.id, c.code, c.symbol
      ORDER BY total_gain DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // Historique des gains sur 12 mois (par mois, tous agents)
  async getMonthlyHistory() {
    const query = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', g.created_at), 'YYYY-MM') as month,
        SUM(g.gain_amount) as total_gain,
        COUNT(DISTINCT g.agent_id) as active_agents,
        COUNT(g.id) as transaction_count
      FROM gains g
      WHERE g.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  // Gains détaillés d'un agent avec infos devise (liste)
  async findDetailedByAgent(agentId, limit, offset) {
    const query = `
      SELECT 
        g.id,
        g.gain_amount,
        g.commission_percent_applied,
        g.created_at,
        t.tracking_code,
        t.status as transaction_status,
        c.code as currency_code,
        c.symbol as currency_symbol,
        a.name as agent_name
      FROM gains g
      JOIN transactions t ON g.transaction_id = t.id
      JOIN currencies c ON g.currency_id = c.id
      JOIN agents a ON g.agent_id = a.id
      WHERE g.agent_id = $1
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [agentId, limit || 50, offset || 0]);
    return result.rows;
  },
};

module.exports = GainModel;