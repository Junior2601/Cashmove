// models/history.model.js
const db = require("../config/db");

const History = {
  // Création avec client optionnel (pour transaction)
  create: async (data, client = null) => {
    const executor = client || db;

    const query = `
      INSERT INTO history (
        action_type,
        actor_type,
        actor_id,
        entity_type,
        entity_id,
        description,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.action_type,
      data.actor_type,
      data.actor_id || null,
      data.entity_type || null,
      data.entity_id || null,
      data.description || null,
      data.metadata ? (typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata)) : null,
    ];

    const result = await executor.query(query, values);
    return result.rows[0];
  },

  findByEntity: async (entity_type, entity_id) => {
    const result = await db.query(
      `SELECT * FROM v_history_details
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entity_type, entity_id]
    );
    return result.rows;
  },

  findByActor: async (actor_type, actor_id) => {
    const result = await db.query(
      `SELECT * FROM v_history_details
       WHERE actor_type = $1 AND actor_id = $2
       ORDER BY created_at DESC`,
      [actor_type, actor_id]
    );
    return result.rows;
  },

  findAll: async (filters = {}) => {
    let query = `SELECT * FROM v_history_details WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (filters.action_type) {
      query += ` AND action_type = $${paramIndex++}`;
      values.push(filters.action_type);
    }

    if (filters.actor_type) {
      query += ` AND actor_type = $${paramIndex++}`;
      values.push(filters.actor_type);
    }

    if (filters.entity_type) {
      query += ` AND entity_type = $${paramIndex++}`;
      values.push(filters.entity_type);
    }

    if (filters.from_date) {
      query += ` AND created_at >= $${paramIndex++}`;
      values.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ` AND created_at <= $${paramIndex++}`;
      values.push(filters.to_date);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  },

  // Nouvelle méthode : pagination
  findAllPaginated: async (filters = {}, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    // Construction de la clause WHERE
    let whereClause = "WHERE 1=1";
    const values = [];
    let paramIndex = 1;

    if (filters.action_type) {
      whereClause += ` AND action_type = $${paramIndex++}`;
      values.push(filters.action_type);
    }
    if (filters.actor_type) {
      whereClause += ` AND actor_type = $${paramIndex++}`;
      values.push(filters.actor_type);
    }
    if (filters.entity_type) {
      whereClause += ` AND entity_type = $${paramIndex++}`;
      values.push(filters.entity_type);
    }
    if (filters.from_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(filters.from_date);
    }
    if (filters.to_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(filters.to_date);
    }

    // Requête de comptage total
    const countQuery = `SELECT COUNT(*) AS total FROM history ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Requête de sélection avec pagination
    const dataQuery = `
      SELECT *
      FROM v_history_details
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(limit, offset);
    const dataResult = await db.query(dataQuery, values);

    return {
      rows: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  },
};

module.exports = History;