const db = require("../config/db");

const Redirection = {
  create: async (data) => {
    const result = await db.query(
      `INSERT INTO redirections
       (transaction_id, from_agent_id, to_agent_id, redirected_amount, reason)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        data.transaction_id,
        data.from_agent_id,
        data.to_agent_id,
        data.amount,
        data.reason,
      ]
    );
    return result.rows[0];
  },

  findById: async (id) => {
    const result = await db.query(
      `SELECT * FROM redirections WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  updateStatus: async (id, status) => {
    const result = await db.query(
      `UPDATE redirections
       SET status = $1,
           processed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },
};

module.exports = Redirection;