const db = require("../config/db");

const SemiAdmin = {
  create: async (data) => {
    const query = `
      INSERT INTO semi_admins (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;
    const values = [data.name, data.email, data.password];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  findByEmail: async (email) => {
    const result = await db.query(
      `SELECT * FROM semi_admins WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  },

  findAll: async () => {
    const result = await db.query(
      `SELECT id, name, email, created_at FROM semi_admins ORDER BY id DESC`
    );
    return result.rows;
  },

  delete: async (id) => {
    await db.query(`DELETE FROM semi_admins WHERE id = $1`, [id]);
  },
};

module.exports = SemiAdmin;