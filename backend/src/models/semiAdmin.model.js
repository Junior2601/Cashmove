const db = require("../config/db");

const SemiAdminModel = {
  // Créer un semi-admin
  create: async ({ name, email, password }) => {
    const query = `
      INSERT INTO semi_admins (name, email, password, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, name, email, is_active, created_at
    `;
    const values = [name, email, password];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  // Trouver par email (utilisé pour login et vérifications)
  findByEmail: async (email) => {
    const query = `SELECT * FROM semi_admins WHERE email = $1`;
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },

  // Trouver par ID
  findById: async (id) => {
    const query = `SELECT id, name, email, is_active, created_at, updated_at FROM semi_admins WHERE id = $1`;
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  // Récupérer tous les semi-admins (option : inclure les inactifs)
  findAll: async (includeInactive = false) => {
    let query = `
      SELECT id, name, email, is_active, created_at, updated_at
      FROM semi_admins
    `;
    if (!includeInactive) {
      query += ` WHERE is_active = true`;
    }
    query += ` ORDER BY id DESC`;
    const { rows } = await db.query(query);
    return rows;
  },

  // Mettre à jour le statut (actif / inactif)
  updateStatus: async (id, isActive) => {
    const query = `
      UPDATE semi_admins
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, is_active, updated_at
    `;
    const { rows } = await db.query(query, [isActive, id]);
    return rows[0];
  },

  // Statistiques : total, actifs, inactifs
  getStats: async () => {
    const query = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive
      FROM semi_admins
    `;
    const { rows } = await db.query(query);
    return rows[0];
  },

  deleteById: async (id) => {
    const query = `DELETE FROM semi_admins WHERE id = $1 RETURNING id`;
    const { rows } = await db.query(query, [id]);
    return rows[0]; // retourne { id } ou undefined si non trouvé
  },

};

module.exports = SemiAdminModel;