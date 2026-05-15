const db = require("../config/db");

const PaymentMethodModel = {
  create: async (data, client = null) => {
    const query = `
      INSERT INTO payment_methods (country_id, method, currency_id, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      data.country_id,
      data.method,
      data.currency_id,
      data.is_active ?? true,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  findAllForAdmin: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT pm.*,
             c.name as country_name,
             c.code as country_code,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      ORDER BY pm.id DESC
    `);
    return rows;
  },

  findAllActive: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT pm.*,
             c.name as country_name,
             c.code as country_code,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id AND c.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE pm.is_active = true AND c.is_active = true AND cur.is_active = true
      ORDER BY c.name ASC, pm.method ASC
    `);
    return rows;
  },

  findByCountryForAdmin: async (countryId, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT pm.*,
             c.name as country_name,
             c.code as country_code,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.country_id = $1
      ORDER BY pm.method ASC
      `,
      [countryId]
    );
    return rows;
  },

  findByCountryForUsers: async (countryId, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT pm.*,
             c.name as country_name,
             c.code as country_code,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id AND c.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE pm.country_id = $1
        AND pm.is_active = true
        AND c.is_active = true
        AND cur.is_active = true
      ORDER BY pm.method ASC
      `,
      [countryId]
    );
    return rows;
  },

  findById: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT pm.*,
             c.name as country_name,
             c.code as country_code,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.id = $1
      `,
      [id]
    );
    return rows[0];
  },

  update: async (id, data, client = null) => {
    const query = `
      UPDATE payment_methods
      SET country_id = $1,
          method = $2,
          currency_id = $3,
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const values = [
      data.country_id,
      data.method,
      data.currency_id,
      data.is_active,
      id,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  softDelete: async (id, client = null) => {
    const query = `
      UPDATE payment_methods
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  hardDelete: async (id, client = null) => {
    await (client || db).query(`DELETE FROM payment_methods WHERE id = $1`, [id]);
  },

  reactivate: async (id, client = null) => {
    const query = `
      UPDATE payment_methods
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  existsInCountry: async (countryId, method, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT id FROM payment_methods WHERE country_id = $1 AND method = $2`,
      [countryId, method]
    );
    return rows[0] || null;
  },
};

module.exports = PaymentMethodModel;