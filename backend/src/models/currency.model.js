const db = require("../config/db");

const Currency = {
  create: async (data) => {
    const query = `
      INSERT INTO currencies (name, code, symbol, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [data.name, data.code, data.symbol, data.is_active !== undefined ? data.is_active : true];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Pour admin - voir toutes les devises (actives + inactives)
  findAllForAdmin: async () => {
    const result = await db.query(
      `SELECT * FROM currencies ORDER BY id DESC`
    );
    return result.rows;
  },

  // Pour utilisateurs normaux - voir uniquement les devises actives
  findAllActive: async () => {
    const result = await db.query(
      `SELECT * FROM currencies WHERE is_active = true ORDER BY id DESC`
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await db.query(
      `SELECT * FROM currencies WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    const query = `
      UPDATE currencies
      SET name = $1, code = $2, symbol = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const values = [data.name, data.code, data.symbol, data.is_active, id];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Soft delete (désactiver uniquement)
  softDelete: async (id) => {
    const query = `
      UPDATE currencies
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Hard delete (suppression définitive - seulement pour admin super)
  hardDelete: async (id) => {
    await db.query(`DELETE FROM currencies WHERE id = $1`, [id]);
  },

  // Réactiver une devise
  reactivate: async (id) => {
    const query = `
      UPDATE currencies
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
};

module.exports = Currency;