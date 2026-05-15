const db = require("../config/db");

const BalanceModel = {
  create: async (data, client = null) => {
    const query = `
      INSERT INTO balances (agent_id, currency_id, amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [data.agent_id, data.currency_id, data.amount ?? 0];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  findAllForAdmin: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT b.*,
             a.name as agent_name,
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.deleted_at IS NULL
      ORDER BY b.id DESC
    `);
    return rows;
  },

  findAllForSemiAdmin: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT b.*,
             a.name as agent_name,
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.deleted_at IS NULL AND a.is_active = true
      ORDER BY a.name ASC, c.code ASC
    `);
    return rows;
  },

  findByAgent: async (agent_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT b.*,
             a.name as agent_name,
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.agent_id = $1 AND b.deleted_at IS NULL
      ORDER BY c.code ASC
      `,
      [agent_id]
    );
    return rows;
  },

  findById: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT b.*,
             a.name as agent_name,
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.id = $1 AND b.deleted_at IS NULL
      `,
      [id]
    );
    return rows[0];
  },

  findByAgentAndCurrency: async (agent_id, currency_id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM balances
       WHERE agent_id = $1 AND currency_id = $2 AND deleted_at IS NULL`,
      [agent_id, currency_id]
    );
    return rows[0];
  },

  updateAmount: async (id, amount, client = null) => {
    const { rows } = await (client || db).query(
      `UPDATE balances
       SET amount = $1, last_updated = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [amount, id]
    );
    return rows[0];
  },

  softDelete: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `UPDATE balances
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return rows[0];
  },

  hardDelete: async (id, client = null) => {
    await (client || db).query(`DELETE FROM balances WHERE id = $1`, [id]);
  },

  hasBalance: async (agent_id, currency_id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT id FROM balances
       WHERE agent_id = $1 AND currency_id = $2 AND deleted_at IS NULL`,
      [agent_id, currency_id]
    );
    return rows[0] || null;
  },

  getTotalBalanceByAgent: async (agent_id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM balances
       WHERE agent_id = $1 AND deleted_at IS NULL`,
      [agent_id]
    );
    return parseFloat(rows[0].total);
  },

  getBalancesByCurrency: async (currency_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT b.*,
             a.name as agent_name,
             a.email as agent_email
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      WHERE b.currency_id = $1 AND b.deleted_at IS NULL AND b.amount > 0
      ORDER BY b.amount DESC
      `,
      [currency_id]
    );
    return rows;
  },

  // Utilisé pour les opérations de credit/debit atomiques
  atomicAddAmount: async (id, increment, client) => {
    const { rows } = await client.query(
      `UPDATE balances
       SET amount = amount + $1, last_updated = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [increment, id]
    );
    if (!rows[0]) throw new Error("Balance not found");
    return rows[0];
  },

  getAmountForUpdate: async (id, client) => {
    const { rows } = await client.query(
      `SELECT amount FROM balances WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    );
    if (!rows[0]) throw new Error("Balance not found");
    return rows[0].amount;
  },
};

module.exports = BalanceModel;