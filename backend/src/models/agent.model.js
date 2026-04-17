const db = require("../config/db");

const Agent = {
  create: async (data) => {
    const query = `
      INSERT INTO agents (name, email, password, country_id, can_process, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, country_id, can_process, is_active, created_at
    `;
    const values = [
      data.name, 
      data.email, 
      data.password, 
      data.country_id,
      data.can_process !== undefined ? data.can_process : false,
      data.is_active !== undefined ? data.is_active : true
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Pour admin - voir tous les agents
  findAllForAdmin: async () => {
    const result = await db.query(`
      SELECT a.*, c.name as country_name, c.code as country_code
      FROM agents a
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.id DESC
    `);
    return result.rows;
  },

  // Pour semi-admin - voir tous les agents actifs
  findAllForSemiAdmin: async () => {
    const result = await db.query(`
      SELECT a.id, a.name, a.email, a.country_id, a.can_process, a.is_active, a.created_at,
             c.name as country_name, c.code as country_code
      FROM agents a
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.deleted_at IS NULL AND a.is_active = true
      ORDER BY a.name ASC
    `);
    return result.rows;
  },

  // Pour agent - voir tous les agents actifs (sauf lui-même ?)
  findAllForAgent: async (currentAgentId = null) => {
    let query = `
      SELECT a.id, a.name, a.email, a.country_id, a.can_process,
             c.name as country_name, c.code as country_code
      FROM agents a
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.deleted_at IS NULL AND a.is_active = true
    `;
    const values = [];
    
    if (currentAgentId) {
      query += ` AND a.id != $1`;
      values.push(currentAgentId);
    }
    
    query += ` ORDER BY a.name ASC`;
    
    const result = await db.query(query, values);
    return result.rows;
  },

  // Trouver un agent par ID avec tous les détails
  findById: async (id) => {
    const result = await db.query(`
      SELECT a.*, c.name as country_name, c.code as country_code
      FROM agents a
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.id = $1 AND a.deleted_at IS NULL
    `, [id]);
    return result.rows[0];
  },

  findByEmail: async (email) => {
    const result = await db.query(
      `SELECT * FROM agents WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0];
  },

  // Mettre à jour un agent
  update: async (id, data) => {
    const query = `
      UPDATE agents 
      SET name = $1, 
          email = $2, 
          country_id = $3, 
          can_process = $4,
          is_active = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING id, name, email, country_id, can_process, is_active, updated_at
    `;
    const values = [
      data.name,
      data.email,
      data.country_id,
      data.can_process !== undefined ? data.can_process : false,
      data.is_active !== undefined ? data.is_active : true,
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Mettre à jour le mot de passe
  updatePassword: async (id, hashedPassword) => {
    const result = await db.query(
      `UPDATE agents 
       SET password = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id`,
      [hashedPassword, id]
    );
    return result.rows[0];
  },

  // Activer/Désactiver un agent
  updateStatus: async (id, is_active) => {
    const result = await db.query(
      `UPDATE agents 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id, name, email, is_active`,
      [is_active, id]
    );
    return result.rows[0];
  },

  // Donner/Retirer la permission de traiter des transactions
  updateCanProcess: async (id, can_process) => {
    const result = await db.query(
      `UPDATE agents 
       SET can_process = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id, name, email, can_process`,
      [can_process, id]
    );
    return result.rows[0];
  },

  // Soft delete
  softDelete: async (id) => {
    const query = `
      UPDATE agents
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Hard delete (suppression définitive)
  hardDelete: async (id) => {
    await db.query(`DELETE FROM agents WHERE id = $1`, [id]);
  },

  // Vérifier si un email existe déjà (exclure un ID spécifique)
  emailExists: async (email, excludeId = null) => {
    let query = `SELECT id FROM agents WHERE email = $1 AND deleted_at IS NULL`;
    const values = [email];
    
    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  // Compter les agents par pays
  countByCountry: async (country_id) => {
    const result = await db.query(
      `SELECT COUNT(*) FROM agents WHERE country_id = $1 AND deleted_at IS NULL AND is_active = true`,
      [country_id]
    );
    return parseInt(result.rows[0].count);
  },

  // Obtenir les agents par pays
  findByCountry: async (country_id) => {
    const result = await db.query(`
      SELECT a.id, a.name, a.email, a.can_process, a.is_active
      FROM agents a
      WHERE a.country_id = $1 AND a.deleted_at IS NULL
      ORDER BY a.name ASC
    `, [country_id]);
    return result.rows;
  }
};

module.exports = Agent;