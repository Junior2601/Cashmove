const db = require("../config/db");

const Rate = {
  // CREATE
  create: async (data) => {
    const query = `
      INSERT INTO rates (
        from_currency_id,
        to_currency_id,
        rate,
        commission_percent,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.from_currency_id,
      data.to_currency_id,
      data.rate,
      data.commission_percent || 0.75,
      data.created_by,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // GET ALL (pour admin - voir tous les taux)
  findAllForAdmin: async () => {
    const result = await db.query(`
      SELECT r.*, 
             fc.code AS from_currency_code,
             fc.name AS from_currency_name,
             tc.code AS to_currency_code,
             tc.name AS to_currency_name,
             a.name AS created_by_name
      FROM rates r
      LEFT JOIN currencies fc ON r.from_currency_id = fc.id
      LEFT JOIN currencies tc ON r.to_currency_id = tc.id
      LEFT JOIN admins a ON r.created_by = a.id
      WHERE r.deleted_at IS NULL
      ORDER BY r.id DESC
    `);

    return result.rows;
  },

  // GET ACTIVE RATES (public)
  findAllActive: async () => {
    const result = await db.query(`
      SELECT r.id,
             r.from_currency_id,
             r.to_currency_id,
             r.rate,
             r.commission_percent,
             (r.rate + 0.20) AS admin_rate,
             fc.code AS from_currency_code,
             fc.name AS from_currency_name,
             fc.symbol AS from_currency_symbol,
             tc.code AS to_currency_code,
             tc.name AS to_currency_name,
             tc.symbol AS to_currency_symbol
      FROM rates r
      LEFT JOIN currencies fc ON r.from_currency_id = fc.id
      LEFT JOIN currencies tc ON r.to_currency_id = tc.id
      WHERE r.is_active = true 
        AND r.deleted_at IS NULL
        AND fc.is_active = true
        AND tc.is_active = true
      ORDER BY fc.code ASC, tc.code ASC
    `);

    return result.rows;
  },

  // GET ACTIVE RATE by currency pair
  findActiveRate: async (from_currency_id, to_currency_id) => {
    const result = await db.query(
      `SELECT r.*,
              fc.code AS from_currency_code,
              fc.name AS from_currency_name,
              tc.code AS to_currency_code,
              tc.name AS to_currency_name,
              (r.rate + 0.20) AS admin_rate
       FROM rates r
       LEFT JOIN currencies fc ON r.from_currency_id = fc.id
       LEFT JOIN currencies tc ON r.to_currency_id = tc.id
       WHERE r.from_currency_id = $1
         AND r.to_currency_id = $2
         AND r.is_active = true
         AND r.deleted_at IS NULL
         AND fc.is_active = true
         AND tc.is_active = true`,
      [from_currency_id, to_currency_id]
    );

    return result.rows[0];
  },

  // GET ACTIVE RATE by currency codes
  findActiveRateByCode: async (from_currency_code, to_currency_code) => {
    const result = await db.query(
      `SELECT r.*,
              fc.code AS from_currency_code,
              fc.name AS from_currency_name,
              tc.code AS to_currency_code,
              tc.name AS to_currency_name,
              (r.rate + 0.20) AS admin_rate
       FROM rates r
       LEFT JOIN currencies fc ON r.from_currency_id = fc.id
       LEFT JOIN currencies tc ON r.to_currency_id = tc.id
       WHERE fc.code = $1
         AND tc.code = $2
         AND r.is_active = true
         AND r.deleted_at IS NULL
         AND fc.is_active = true
         AND tc.is_active = true`,
      [from_currency_code.toUpperCase(), to_currency_code.toUpperCase()]
    );

    return result.rows[0];
  },

  // GET RATE by ID
  findById: async (id) => {
    const result = await db.query(
      `SELECT r.*,
              fc.code AS from_currency_code,
              fc.name AS from_currency_name,
              tc.code AS to_currency_code,
              tc.name AS to_currency_name,
              a.name AS created_by_name
       FROM rates r
       LEFT JOIN currencies fc ON r.from_currency_id = fc.id
       LEFT JOIN currencies tc ON r.to_currency_id = tc.id
       LEFT JOIN admins a ON r.created_by = a.id
       WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [id]
    );

    return result.rows[0];
  },

  // UPDATE
  update: async (id, data) => {
    const query = `
      UPDATE rates
      SET rate = $1,
          commission_percent = $2,
          is_active = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const values = [
      data.rate,
      data.commission_percent,
      data.is_active,
      id,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // TOGGLE ACTIVE STATUS
  toggleActive: async (id, is_active) => {
    const result = await db.query(
      `UPDATE rates 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [is_active, id]
    );
    return result.rows[0];
  },

  // SOFT DELETE
  softDelete: async (id) => {
    const result = await db.query(
      `UPDATE rates 
       SET deleted_at = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  // HARD DELETE
  hardDelete: async (id) => {
    await db.query(`DELETE FROM rates WHERE id = $1`, [id]);
  },

  // GET RATES BY COUNTRY (via currency)
  findActiveRatesByCountry: async (country_id) => {
    const result = await db.query(
      `SELECT DISTINCT r.*,
              fc.code AS from_currency_code,
              fc.name AS from_currency_name,
              tc.code AS to_currency_code,
              tc.name AS to_currency_name,
              (r.rate + 0.20) AS admin_rate
       FROM rates r
       LEFT JOIN currencies fc ON r.from_currency_id = fc.id
       LEFT JOIN currencies tc ON r.to_currency_id = tc.id
       LEFT JOIN countries c ON c.currency_id = fc.id OR c.currency_id = tc.id
       WHERE c.id = $1
         AND r.is_active = true
         AND r.deleted_at IS NULL
         AND fc.is_active = true
         AND tc.is_active = true
       ORDER BY fc.code ASC, tc.code ASC`,
      [country_id]
    );
    return result.rows;
  },

  // GET RATES BY CURRENCY
  findActiveRatesByCurrency: async (currency_id) => {
    const result = await db.query(
      `SELECT r.*,
              fc.code AS from_currency_code,
              fc.name AS from_currency_name,
              tc.code AS to_currency_code,
              tc.name AS to_currency_name,
              (r.rate + 0.20) AS admin_rate
       FROM rates r
       LEFT JOIN currencies fc ON r.from_currency_id = fc.id
       LEFT JOIN currencies tc ON r.to_currency_id = tc.id
       WHERE (r.from_currency_id = $1 OR r.to_currency_id = $1)
         AND r.is_active = true
         AND r.deleted_at IS NULL
         AND fc.is_active = true
         AND tc.is_active = true
       ORDER BY fc.code ASC, tc.code ASC`,
      [currency_id]
    );
    return result.rows;
  },

  // CHECK IF RATE EXISTS FOR PAIR
  existsForPair: async (from_currency_id, to_currency_id, excludeId = null) => {
    let query = `
      SELECT id FROM rates 
      WHERE from_currency_id = $1 
        AND to_currency_id = $2 
        AND deleted_at IS NULL
    `;
    const values = [from_currency_id, to_currency_id];
    
    if (excludeId) {
      query += ` AND id != $3`;
      values.push(excludeId);
    }
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  // CONVERT AMOUNT (calcule le montant converti avec commission)
  convertAmount: async (from_currency_id, to_currency_id, amount) => {
    const rate = await Rate.findActiveRate(from_currency_id, to_currency_id);
    
    if (!rate) {
      return null;
    }
    
    const convertedAmount = amount * parseFloat(rate.rate);
    const commission = convertedAmount * (parseFloat(rate.commission_percent) / 100);
    const totalAmount = convertedAmount + commission;
    
    return {
      original_amount: parseFloat(amount),
      converted_amount: convertedAmount,
      commission_amount: commission,
      total_amount: totalAmount,
      rate_used: parseFloat(rate.rate),
      commission_percent: parseFloat(rate.commission_percent),
      admin_rate: parseFloat(rate.rate) + 0.20
    };
  }
};

module.exports = Rate;