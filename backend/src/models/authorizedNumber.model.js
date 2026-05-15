const db = require("../config/db");

const AuthorizedNumberModel = {
  create: async (data, client = null) => {
    const query = `
      INSERT INTO authorized_numbers (agent_id, country_id, payment_method_id, number, label, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.agent_id,
      data.country_id,
      data.payment_method_id,
      data.number,
      data.label || null,
      data.is_active ?? true,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  findAllForAdmin: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id
      LEFT JOIN countries c ON an.country_id = c.id
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      ORDER BY an.id DESC
    `);
    return rows;
  },

  findAllActive: async (client = null) => {
    const { rows } = await (client || db).query(`
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id AND a.is_active = true
      LEFT JOIN countries c ON an.country_id = c.id AND c.is_active = true
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id AND pm.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE an.is_active = true
        AND a.is_active = true
        AND c.is_active = true
        AND pm.is_active = true
        AND cur.is_active = true
      ORDER BY c.name ASC, a.name ASC
    `);
    return rows;
  },

  findByCountryForAdmin: async (country_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id
      LEFT JOIN countries c ON an.country_id = c.id
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE an.country_id = $1
      ORDER BY an.number ASC
      `,
      [country_id]
    );
    return rows;
  },

  findByCountryForUsers: async (country_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id AND a.is_active = true
      LEFT JOIN countries c ON an.country_id = c.id AND c.is_active = true
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id AND pm.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE an.country_id = $1
        AND an.is_active = true
        AND a.is_active = true
        AND c.is_active = true
        AND pm.is_active = true
        AND cur.is_active = true
      ORDER BY an.number ASC
      `,
      [country_id]
    );
    return rows;
  },

  findByAgentForAdmin: async (agent_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id
      LEFT JOIN countries c ON an.country_id = c.id
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE an.agent_id = $1
      ORDER BY an.id DESC
      `,
      [agent_id]
    );
    return rows;
  },

  findByAgentForUsers: async (agent_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id AND a.is_active = true
      LEFT JOIN countries c ON an.country_id = c.id AND c.is_active = true
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id AND pm.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE an.agent_id = $1
        AND an.is_active = true
        AND a.is_active = true
        AND c.is_active = true
        AND pm.is_active = true
        AND cur.is_active = true
      ORDER BY an.number ASC
      `,
      [agent_id]
    );
    return rows;
  },

  findByPaymentMethodForAdmin: async (payment_method_id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id
      LEFT JOIN countries c ON an.country_id = c.id
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE an.payment_method_id = $1
      ORDER BY an.id DESC
      `,
      [payment_method_id]
    );
    return rows;
  },

  findById: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `
      SELECT an.*,
             a.name as agent_name,
             a.email as agent_email,
             c.name as country_name,
             c.code as country_code,
             pm.method as payment_method_name,
             cur.name as currency_name,
             cur.code as currency_code
      FROM authorized_numbers an
      LEFT JOIN agents a ON an.agent_id = a.id
      LEFT JOIN countries c ON an.country_id = c.id
      LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE an.id = $1
      `,
      [id]
    );
    return rows[0];
  },

  update: async (id, data, client = null) => {
    const query = `
      UPDATE authorized_numbers
      SET agent_id = $1,
          country_id = $2,
          payment_method_id = $3,
          number = $4,
          label = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const values = [
      data.agent_id,
      data.country_id,
      data.payment_method_id,
      data.number,
      data.label || null,
      data.is_active,
      id,
    ];
    const { rows } = await (client || db).query(query, values);
    return rows[0];
  },

  softDelete: async (id, client = null) => {
    const query = `
      UPDATE authorized_numbers
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  hardDelete: async (id, client = null) => {
    await (client || db).query(`DELETE FROM authorized_numbers WHERE id = $1`, [id]);
  },

  reactivate: async (id, client = null) => {
    const query = `
      UPDATE authorized_numbers
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await (client || db).query(query, [id]);
    return rows[0];
  },

  existsForCombination: async (agent_id, country_id, payment_method_id, excludeId = null, client = null) => {
    let query = `
      SELECT id FROM authorized_numbers
      WHERE agent_id = $1 AND country_id = $2 AND payment_method_id = $3
    `;
    const values = [agent_id, country_id, payment_method_id];
    if (excludeId) {
      query += ` AND id != $4`;
      values.push(excludeId);
    }
    const { rows } = await (client || db).query(query, values);
    return rows[0] || null;
  },

  getAgentActiveStatus: async (agent_id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT is_active FROM agents WHERE id = $1`,
      [agent_id]
    );
    return rows[0]?.is_active || false;
  },
};

module.exports = AuthorizedNumberModel;