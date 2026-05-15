const db = require("../config/db");

const CurrencyModel = {
  // Création
  create: async (data, client = null) => {
    const query = `
      INSERT INTO currencies (name, code, symbol, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [data.name, data.code, data.symbol, data.is_active ?? true];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  // Admin – toutes les devises
  findAllForAdmin: async (client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM currencies ORDER BY id DESC`
    );
    return rows;
  },

  // Actives uniquement
  findAllActive: async (client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM currencies WHERE is_active = true ORDER BY id DESC`
    );
    return rows;
  },

  findById: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM currencies WHERE id = $1`,
      [id]
    );
    return rows[0];
  },

  update: async (id, data, client = null) => {
    const query = `
      UPDATE currencies
      SET name = $1, code = $2, symbol = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const values = [data.name, data.code, data.symbol, data.is_active, id];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  softDelete: async (id, client = null) => {
    const query = `
      UPDATE currencies
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  hardDelete: async (id, client = null) => {
    await (client || db).query(`DELETE FROM currencies WHERE id = $1`, [id]);
  },

  reactivate: async (id, client = null) => {
    const query = `
      UPDATE currencies
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  // Vérification d'existence par code (utile pour éviter les doublons)
  findByCode: async (code, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM currencies WHERE code = $1`,
      [code]
    );
    return rows[0];
  },
};

module.exports = CurrencyModel;