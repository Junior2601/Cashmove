const db = require("../config/db");

const AuthorizedNumber = {
  create: async (data) => {
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
      data.is_active !== undefined ? data.is_active : true
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Pour admin - voir tous les numéros autorisés (actifs + inactifs)
  findAllForAdmin: async () => {
    const result = await db.query(`
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
    return result.rows;
  },

  // Pour utilisateurs normaux - voir uniquement les numéros actifs
  // avec agent actif, pays actif et méthode de paiement active
  findAllActive: async () => {
    const result = await db.query(`
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
    return result.rows;
  },

  // Trouver par pays - pour admin (tous les numéros du pays)
  findByCountryForAdmin: async (country_id) => {
    const result = await db.query(`
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
    `, [country_id]);
    return result.rows;
  },

  // Trouver par pays - pour utilisateurs (numéros actifs uniquement)
  findByCountryForUsers: async (country_id) => {
    const result = await db.query(`
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
    `, [country_id]);
    return result.rows;
  },

  // Trouver par agent - pour admin
  findByAgentForAdmin: async (agent_id) => {
    const result = await db.query(`
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
    `, [agent_id]);
    return result.rows;
  },

  // Trouver par agent - pour utilisateurs (numéros actifs uniquement)
  findByAgentForUsers: async (agent_id) => {
    const result = await db.query(`
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
    `, [agent_id]);
    return result.rows;
  },

  // Trouver par méthode de paiement - pour admin
  findByPaymentMethodForAdmin: async (payment_method_id) => {
    const result = await db.query(`
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
    `, [payment_method_id]);
    return result.rows;
  },

  findById: async (id) => {
    const result = await db.query(`
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
    `, [id]);
    return result.rows[0];
  },

  update: async (id, data) => {
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
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Soft delete (désactiver uniquement)
  softDelete: async (id) => {
    const query = `
      UPDATE authorized_numbers
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Hard delete (suppression définitive - seulement pour admin super)
  hardDelete: async (id) => {
    await db.query(`DELETE FROM authorized_numbers WHERE id = $1`, [id]);
  },

  // Réactiver un numéro autorisé
  reactivate: async (id) => {
    const query = `
      UPDATE authorized_numbers
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Vérifier si un numéro existe déjà pour la combinaison agent/pays/méthode
  existsForCombination: async (agent_id, country_id, payment_method_id, excludeId = null) => {
    let query = `
      SELECT id FROM authorized_numbers 
      WHERE agent_id = $1 AND country_id = $2 AND payment_method_id = $3
    `;
    const values = [agent_id, country_id, payment_method_id];
    
    if (excludeId) {
      query += ` AND id != $4`;
      values.push(excludeId);
    }
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  // Vérifier si un agent est actif
  isAgentActive: async (agent_id) => {
    const result = await db.query(
      `SELECT is_active FROM agents WHERE id = $1`,
      [agent_id]
    );
    return result.rows[0]?.is_active || false;
  }
};

module.exports = AuthorizedNumber;