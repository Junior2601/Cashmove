const db = require("../config/db");

const History = {
  // CREATE (log action)
  create: async (data) => {
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
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;

    const values = [
      data.action_type,
      data.actor_type,
      data.actor_id || null,
      data.entity_type || null,
      data.entity_id || null,
      data.description || null,
      data.metadata || null,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // GET ALL
  findAll: async () => {
    const result = await db.query(`
      SELECT *
      FROM history
      ORDER BY created_at DESC
    `);

    return result.rows;
  },

  // GET BY ENTITY
  findByEntity: async (entity_type, entity_id) => {
    const result = await db.query(
      `SELECT *
       FROM history
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entity_type, entity_id]
    );

    return result.rows;
  },

  // GET BY ACTOR
  findByActor: async (actor_type, actor_id) => {
    const result = await db.query(
      `SELECT *
       FROM history
       WHERE actor_type = $1 AND actor_id = $2
       ORDER BY created_at DESC`,
      [actor_type, actor_id]
    );

    return result.rows;
  },
};

module.exports = History;