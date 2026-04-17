const db = require("../config/db");

const PaymentMethod = {
  create: async (data) => {
    const query = `
      INSERT INTO payment_methods (country_id, method, currency_id, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      data.country_id,
      data.method,
      data.currency_id,
      data.is_active !== undefined ? data.is_active : true
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Pour admin - voir toutes les méthodes de paiement (actives + inactives)
  findAllForAdmin: async () => {
    const result = await db.query(`
      SELECT pm.*, 
             c.name as country_name, 
             c.code as country_code,
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      ORDER BY pm.id DESC
    `);
    return result.rows;
  },

  // Pour utilisateurs normaux - voir uniquement les méthodes de paiement actives
  // pour les pays actifs avec leurs devises actives
  findAllActive: async () => {
    const result = await db.query(`
      SELECT pm.*, 
             c.name as country_name, 
             c.code as country_code,
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id AND c.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE pm.is_active = true AND c.is_active = true AND cur.is_active = true
      ORDER BY c.name ASC, pm.method ASC
    `);
    return result.rows;
  },

  // Trouver par pays - pour admin (toutes les méthodes du pays)
  findByCountryForAdmin: async (countryId) => {
    const result = await db.query(`
      SELECT pm.*, 
             c.name as country_name, 
             c.code as country_code,
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.country_id = $1
      ORDER BY pm.method ASC
    `, [countryId]);
    return result.rows;
  },

  // Trouver par pays - pour utilisateurs (méthodes actives uniquement)
  findByCountryForUsers: async (countryId) => {
    const result = await db.query(`
      SELECT pm.*, 
             c.name as country_name, 
             c.code as country_code,
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id AND c.is_active = true
      LEFT JOIN currencies cur ON pm.currency_id = cur.id AND cur.is_active = true
      WHERE pm.country_id = $1 
        AND pm.is_active = true 
        AND c.is_active = true 
        AND cur.is_active = true
      ORDER BY pm.method ASC
    `, [countryId]);
    return result.rows;
  },

  findById: async (id) => {
    const result = await db.query(`
      SELECT pm.*, 
             c.name as country_name, 
             c.code as country_code,
             cur.name as currency_name, 
             cur.code as currency_code,
             cur.symbol as currency_symbol
      FROM payment_methods pm
      LEFT JOIN countries c ON pm.country_id = c.id
      LEFT JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.id = $1
    `, [id]);
    return result.rows[0];
  },

  update: async (id, data) => {
    const query = `
      UPDATE payment_methods
      SET country_id = $1, 
          method = $2, 
          currency_id = $3, 
          is_active = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const values = [
      data.country_id,
      data.method,
      data.currency_id,
      data.is_active,
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Soft delete (désactiver uniquement)
  softDelete: async (id) => {
    const query = `
      UPDATE payment_methods
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Hard delete (suppression définitive - seulement pour admin super)
  hardDelete: async (id) => {
    await db.query(`DELETE FROM payment_methods WHERE id = $1`, [id]);
  },

  // Réactiver une méthode de paiement
  reactivate: async (id) => {
    const query = `
      UPDATE payment_methods
      SET is_active = true, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Vérifier si une devise est utilisée par une méthode de paiement active
  isCurrencyUsedByActivePaymentMethod: async (currencyId) => {
    const result = await db.query(
      `SELECT COUNT(*) FROM payment_methods 
       WHERE currency_id = $1 AND is_active = true`,
      [currencyId]
    );
    return parseInt(result.rows[0].count) > 0;
  },

  // Vérifier si une méthode existe déjà pour un pays
  existsInCountry: async (countryId, method) => {
    const result = await db.query(
      `SELECT id FROM payment_methods 
       WHERE country_id = $1 AND method = $2`,
      [countryId, method]
    );
    return result.rows[0] || null;
  }
};

module.exports = PaymentMethod;