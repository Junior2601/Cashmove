const db = require("../config/db");

const RateModel = {
  create: async (data, client = null) => {
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
      data.commission_percent ?? 0.75,
      data.created_by,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  findAllForAdmin: async (client = null) => {
    const { rows } = await (client || db).query(`
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
    return rows;
  },

  findAllActive: async (client = null) => {
    const { rows } = await (client || db).query(`
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
    return rows;
  },

  findActiveRate: async (from_currency_id, to_currency_id, client = null) => {
    const { rows } = await (client || db).query(
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
    return rows[0];
  },

  findActiveRateByCode: async (from_code, to_code, client = null) => {
    const { rows } = await (client || db).query(
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
      [from_code.toUpperCase(), to_code.toUpperCase()]
    );
    return rows[0];
  },

  findById: async (id, client = null) => {
    const { rows } = await (client || db).query(
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
    return rows[0];
  },

  update: async (id, data, client = null) => {
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
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  toggleActive: async (id, is_active, client = null) => {
    const { rows } = await (client || db).query(
      `UPDATE rates
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [is_active, id]
    );
    return rows[0];
  },

  softDelete: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `UPDATE rates
       SET deleted_at = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return rows[0];
  },

  hardDelete: async (id, client = null) => {
    await (client || db).query(`DELETE FROM rates WHERE id = $1`, [id]);
  },

  findActiveRatesByCountry: async (country_id, client = null) => {
    const { rows } = await (client || db).query(
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
    return rows;
  },

  findActiveRatesByCurrency: async (currency_id, client = null) => {
    const { rows } = await (client || db).query(
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
    return rows;
  },

  existsForPair: async (from_currency_id, to_currency_id, excludeId = null, client = null) => {
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
    const { rows } = await (client || db).query(query, values);
    return rows[0] || null;
  },

  getStats: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive
      FROM rates
      WHERE deleted_at IS NULL
    `);
    return rows[0];
  },
};

module.exports = RateModel;