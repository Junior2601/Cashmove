const db = require("../config/db");

const CountryModel = {
  create: async (data, client = null) => {
    const query = `
      INSERT INTO countries (name, code, phone_prefix, currency_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.name,
      data.code,
      data.phone_prefix,
      data.currency_id,
      data.is_active ?? true,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  findAllForAdmin: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT c.*,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM countries c
      LEFT JOIN currencies cur ON c.currency_id = cur.id
      ORDER BY c.id DESC
    `);
    return rows;
  },

  findAllActive: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT c.*,
             cur.name as currency_name,
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM countries c
      LEFT JOIN currencies cur ON c.currency_id = cur.id AND cur.is_active = true
      WHERE c.is_active = true
      ORDER BY c.name ASC
    `);
    return rows;
  },

  findById: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT c.*,
              cur.name as currency_name,
              cur.code as currency_code,
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    return rows[0];
  },

  update: async (id, data, client = null) => {
    const query = `
      UPDATE countries
      SET name = $1,
          code = $2,
          phone_prefix = $3,
          currency_id = $4,
          is_active = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const values = [
      data.name,
      data.code,
      data.phone_prefix,
      data.currency_id,
      data.is_active,
      id,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  softDelete: async (id, client = null) => {
    const query = `
      UPDATE countries
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  hardDelete: async (id, client = null) => {
    await (client || db).query(`DELETE FROM countries WHERE id = $1`, [id]);
  },

  reactivate: async (id, client = null) => {
    const query = `
      UPDATE countries
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  isCurrencyUsedByActiveCountry: async (currencyId, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT COUNT(*) FROM countries
       WHERE currency_id = $1 AND is_active = true`,
      [currencyId]
    );
    return parseInt(rows[0].count) > 0;
  },

  // Vérifications d'unicité
  findByName: async (name, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM countries WHERE name = $1`,
      [name]
    );
    return rows[0];
  },

  findByCode: async (code, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM countries WHERE code = $1`,
      [code]
    );
    return rows[0];
  },

  getStats: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive
      FROM countries
    `);
    return {
      total: parseInt(rows[0].total),
      active: parseInt(rows[0].active),
      inactive: parseInt(rows[0].inactive),
    };
  },
};

module.exports = CountryModel;