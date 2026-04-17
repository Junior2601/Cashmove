const db = require("../config/db");

const Admin = {
  // créer admin
  create: async (data) => {
    const query = `
      INSERT INTO admins (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;
    const values = [data.name, data.email, data.password];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // trouver par email
  findByEmail: async (email) => {
    const result = await db.query(
      `SELECT * FROM admins WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  },

  // trouver par id
  findById: async (id) => {
    const result = await db.query(
      `SELECT id, name, email, created_at FROM admins WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // récupérer tous
  findAll: async () => {
    const result = await db.query(
      `SELECT id, name, email, created_at FROM admins ORDER BY id DESC`
    );
    return result.rows;
  },

  // supprimer
  delete: async (id) => {
    await db.query(`DELETE FROM admins WHERE id = $1`, [id]);
  },
};

module.exports = Admin;