const db = require("../config/db");

const Country = {
  create: async (data) => {
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
      data.is_active !== undefined ? data.is_active : true
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Pour admin - voir tous les pays (actifs + inactifs)
  findAllForAdmin: async () => {
    const result = await db.query(`
      SELECT c.*, 
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM countries c
      LEFT JOIN currencies cur ON c.currency_id = cur.id
      ORDER BY c.id DESC
    `);
    return result.rows;
  },

  // Pour utilisateurs normaux - voir uniquement les pays actifs avec leurs devises actives
  findAllActive: async () => {
    const result = await db.query(`
      SELECT c.*, 
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM countries c
      LEFT JOIN currencies cur ON c.currency_id = cur.id AND cur.is_active = true
      WHERE c.is_active = true
      ORDER BY c.name ASC
    `);
    return result.rows;
  },

  findById: async (id) => {
    const result = await db.query(
      `SELECT c.*, 
              cur.name as currency_name, 
              cur.code as currency_code,
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
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
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Soft delete (désactiver uniquement)
  softDelete: async (id) => {
    const query = `
      UPDATE countries
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Hard delete (suppression définitive - seulement pour admin super)
  hardDelete: async (id) => {
    await db.query(`DELETE FROM countries WHERE id = $1`, [id]);
  },

  // Réactiver un pays
  reactivate: async (id) => {
    const query = `
      UPDATE countries
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Vérifier si une devise est utilisée par un pays actif
  isCurrencyUsedByActiveCountry: async (currencyId) => {
    const result = await db.query(
      `SELECT COUNT(*) FROM countries 
       WHERE currency_id = $1 AND is_active = true`,
      [currencyId]
    );
    return parseInt(result.rows[0].count) > 0;
  }
};

module.exports = Country;