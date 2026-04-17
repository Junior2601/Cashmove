const db = require("../config/db");

const Balance = {
  create: async (data) => {
    const query = `
      INSERT INTO balances (agent_id, currency_id, amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [data.agent_id, data.currency_id, data.amount || 0];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // Pour admin - voir toutes les balances (actives)
  findAllForAdmin: async () => {
    const result = await db.query(`
      SELECT b.*, 
             a.name as agent_name, 
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.deleted_at IS NULL
      ORDER BY b.id DESC
    `);
    return result.rows;
  },

  // Pour semi-admin - voir toutes les balances des agents
  findAllForSemiAdmin: async () => {
    const result = await db.query(`
      SELECT b.*, 
             a.name as agent_name, 
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.deleted_at IS NULL AND a.is_active = true
      ORDER BY a.name ASC, c.code ASC
    `);
    return result.rows;
  },

  // Pour agent - voir ses propres balances
  findByAgent: async (agent_id) => {
    const result = await db.query(`
      SELECT b.*, 
             a.name as agent_name, 
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.agent_id = $1 AND b.deleted_at IS NULL
      ORDER BY c.code ASC
    `, [agent_id]);
    return result.rows;
  },

  // Trouver une balance par ID
  findById: async (id) => {
    const result = await db.query(`
      SELECT b.*, 
             a.name as agent_name, 
             a.email as agent_email,
             c.code as currency_code,
             c.name as currency_name,
             c.symbol as currency_symbol
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN currencies c ON b.currency_id = c.id
      WHERE b.id = $1 AND b.deleted_at IS NULL
    `, [id]);
    return result.rows[0];
  },

  // Trouver une balance par agent et devise
  findByAgentAndCurrency: async (agent_id, currency_id) => {
    const result = await db.query(`
      SELECT * FROM balances 
      WHERE agent_id = $1 AND currency_id = $2 AND deleted_at IS NULL
    `, [agent_id, currency_id]);
    return result.rows[0];
  },

  // Créditer une balance (augmenter le montant)
  credit: async (id, amount, description = null) => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Mettre à jour le montant
      const updateQuery = `
        UPDATE balances 
        SET amount = amount + $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
      const result = await client.query(updateQuery, [amount, id]);
      
      if (!result.rows[0]) {
        throw new Error('Balance not found');
      }
      
      // Optionnel: Enregistrer la transaction dans une table d'historique
      if (description) {
        await client.query(`
          INSERT INTO balance_transactions (balance_id, amount, type, description, created_at)
          VALUES ($1, $2, 'credit', $3, CURRENT_TIMESTAMP)
        `, [id, amount, description]);
      }
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Débiter une balance (diminuer le montant)
  debit: async (id, amount, description = null) => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Vérifier le solde avant débit
      const checkQuery = `SELECT amount FROM balances WHERE id = $1 AND deleted_at IS NULL`;
      const checkResult = await client.query(checkQuery, [id]);
      
      if (!checkResult.rows[0]) {
        throw new Error('Balance not found');
      }
      
      const currentAmount = parseFloat(checkResult.rows[0].amount);
      if (currentAmount < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Mettre à jour le montant
      const updateQuery = `
        UPDATE balances 
        SET amount = amount - $1, last_updated = CURRENT_TIMESTAMP
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
      const result = await client.query(updateQuery, [amount, id]);
      
      // Optionnel: Enregistrer la transaction dans une table d'historique
      if (description) {
        await client.query(`
          INSERT INTO balance_transactions (balance_id, amount, type, description, created_at)
          VALUES ($1, $2, 'debit', $3, CURRENT_TIMESTAMP)
        `, [id, amount, description]);
      }
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Mettre à jour le montant (méthode générique)
  updateAmount: async (id, amount) => {
    const result = await db.query(
      `UPDATE balances 
       SET amount = $1, last_updated = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING *`,
      [amount, id]
    );
    return result.rows[0];
  },

  // Soft delete (suppression logique)
  softDelete: async (id) => {
    const query = `
      UPDATE balances
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Hard delete (suppression définitive - seulement pour admin super)
  hardDelete: async (id) => {
    await db.query(`DELETE FROM balances WHERE id = $1`, [id]);
  },

  // Vérifier si un agent a une balance pour une devise
  hasBalance: async (agent_id, currency_id) => {
    const result = await db.query(
      `SELECT id FROM balances 
       WHERE agent_id = $1 AND currency_id = $2 AND deleted_at IS NULL`,
      [agent_id, currency_id]
    );
    return result.rows[0] || null;
  },

  // Obtenir le total des balances d'un agent
  getTotalBalanceByAgent: async (agent_id) => {
    const result = await db.query(`
      SELECT SUM(b.amount) as total_amount
      FROM balances b
      WHERE b.agent_id = $1 AND b.deleted_at IS NULL
    `, [agent_id]);
    return parseFloat(result.rows[0].total_amount) || 0;
  },

  // Obtenir les balances par devise
  getBalancesByCurrency: async (currency_id) => {
    const result = await db.query(`
      SELECT b.*, 
             a.name as agent_name, 
             a.email as agent_email
      FROM balances b
      LEFT JOIN agents a ON b.agent_id = a.id
      WHERE b.currency_id = $1 AND b.deleted_at IS NULL AND b.amount > 0
      ORDER BY b.amount DESC
    `, [currency_id]);
    return result.rows;
  }
};

module.exports = Balance;