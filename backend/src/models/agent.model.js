// ======================= models/agent.model.js =======================
const db = require("../config/db");

/**
 * Modèle Agent : uniquement des requêtes SQL brutes.
 * Toutes les méthodes acceptent un client optionnel (pour transactions).
 */
const AgentModel = {
  // Création d'un agent
  create: async (data, client = null) => {
    const dbClient = client || db;
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
      data.can_process,
      data.is_active,
    ];
    const result = await dbClient.query(query, values);
    return result.rows[0];
  },

  // Admin : tous les agents (avec soft delete)
  findAllForAdmin: async (client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(`
      SELECT a.*, c.name as country_name, c.code as country_code
      FROM agents a
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.id DESC
    `);
    return result.rows;
  },

  // Semi-admin : agents actifs uniquement
  findAllForSemiAdmin: async (client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(`
      SELECT a.id, a.name, a.email, a.country_id, a.can_process, a.is_active, a.created_at,
             c.name as country_name, c.code as country_code
      FROM agents a
      LEFT JOIN countries c ON a.country_id = c.id
      WHERE a.deleted_at IS NULL AND a.is_active = true
      ORDER BY a.name ASC
    `);
    return result.rows;
  },

  // Agent : tous les agents actifs sauf lui-même
  findAllForAgent: async (currentAgentId = null, client = null) => {
    const dbClient = client || db;
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
    const result = await dbClient.query(query, values);
    return result.rows;
  },

  // Trouver un agent par ID (avec infos pays)
  findById: async (id, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `SELECT a.*, c.name as country_name, c.code as country_code
       FROM agents a
       LEFT JOIN countries c ON a.country_id = c.id
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id]
    );
    return result.rows[0];
  },

  // Trouver par email
  findByEmail: async (email, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `SELECT * FROM agents WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0];
  },

  // Mise à jour complète d'un agent (sauf mot de passe)
  update: async (id, data, client = null) => {
    const dbClient = client || db;
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
      data.can_process,
      data.is_active,
      id,
    ];
    const result = await dbClient.query(query, values);
    return result.rows[0];
  },

  // Mise à jour du mot de passe uniquement
  updatePassword: async (id, hashedPassword, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `UPDATE agents 
       SET password = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id`,
      [hashedPassword, id]
    );
    return result.rows[0];
  },

  // Changer le statut actif/inactif
  updateStatus: async (id, is_active, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `UPDATE agents 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id, name, email, is_active`,
      [is_active, id]
    );
    return result.rows[0];
  },

  // Changer la permission de traitement
  updateCanProcess: async (id, can_process, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `UPDATE agents 
       SET can_process = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING id, name, email, can_process`,
      [can_process, id]
    );
    return result.rows[0];
  },

  // Suppression logique
  softDelete: async (id, client = null) => {
    const dbClient = client || db;
    const query = `
      UPDATE agents
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email
    `;
    const result = await dbClient.query(query, [id]);
    return result.rows[0];
  },

  // Suppression physique
  hardDelete: async (id, client = null) => {
    const dbClient = client || db;
    await dbClient.query(`DELETE FROM agents WHERE id = $1`, [id]);
  },

  // Vérifier l'existence d'un email (optionnellement exclure un ID)
  emailExists: async (email, excludeId = null, client = null) => {
    const dbClient = client || db;
    let query = `SELECT id FROM agents WHERE email = $1 AND deleted_at IS NULL`;
    const values = [email];
    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }
    const result = await dbClient.query(query, values);
    return result.rows[0] || null;
  },

  // Compter les agents actifs d'un pays
  countByCountry: async (country_id, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `SELECT COUNT(*) FROM agents WHERE country_id = $1 AND deleted_at IS NULL AND is_active = true`,
      [country_id]
    );
    return parseInt(result.rows[0].count);
  },

  // Lister les agents d'un pays
  findByCountry: async (country_id, client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(
      `SELECT a.id, a.name, a.email, a.can_process, a.is_active
       FROM agents a
       WHERE a.country_id = $1 AND a.deleted_at IS NULL
       ORDER BY a.name ASC`,
      [country_id]
    );
    return result.rows;
  },

  getGlobalStats: async (client = null) => {
    const dbClient = client || db;
    const result = await dbClient.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive
      FROM agents
      WHERE deleted_at IS NULL
    `);
    return {
      total: parseInt(result.rows[0].total, 10),
      active: parseInt(result.rows[0].active, 10),
      inactive: parseInt(result.rows[0].inactive, 10)
    };
  },
};

module.exports = AgentModel;