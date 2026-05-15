const db = require("../config/db");

const Benefit = {
  getTotal: async () => {
    const result = await db.query(`
      SELECT 
        SUM(
          CASE 
            WHEN c.code = 'RUB' THEN b.amount
            ELSE b.amount / (r.rate + 0.2)
          END
        ) AS total_benefit_rub
      FROM balances b
      JOIN currencies c ON b.currency_id = c.id

      LEFT JOIN rates r 
        ON r.from_currency_id = c.id
        AND r.to_currency_id = (
          SELECT id FROM currencies WHERE code = 'RUB'
        )
        AND r.is_active = true

      WHERE b.deleted_at IS NULL
    `);

    return result.rows[0];
  },
};

module.exports = Benefit;