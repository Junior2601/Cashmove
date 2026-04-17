// models/transaction.model.js
const db = require("../config/db");
const History = require("./history.model");

const Transaction = {
  create: async (data) => {
    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");
      
      const query = `
        INSERT INTO transactions (
          tracking_code,
          from_country_id,
          to_country_id,
          sender_phone,
          receiver_phone,
          sender_method_id,
          receiver_method_id,
          send_amount,
          receive_amount,
          rate_applied,
          commission_applied,
          assigned_agent_id,
          authorized_number_id,
          expires_at
        )
        VALUES (
          generate_tracking_code(),
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          NOW() + INTERVAL '5 minutes'
        )
        RETURNING *
      `;

      const values = [
        data.from_country_id,
        data.to_country_id,
        data.sender_phone,
        data.receiver_phone,
        data.sender_method_id,
        data.receiver_method_id,
        data.send_amount,
        data.receive_amount,
        data.rate_applied,
        data.commission_applied,
        data.assigned_agent_id,
        data.authorized_number_id,
      ];

      const result = await client.query(query, values);
      const transaction = result.rows[0];
      
      // Log la création
      await History.create({
        action_type: "transaction_created",
        actor_type: "client",
        actor_id: null,
        entity_type: "transaction",
        entity_id: transaction.id,
        description: `Transaction créée avec code ${transaction.tracking_code}`,
        metadata: JSON.stringify({ transaction_id: transaction.id, amount: transaction.send_amount })
      });
      
      await client.query("COMMIT");
      return transaction;
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  findById: async (id, forUpdate = false) => {
    const query = forUpdate 
      ? `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`
      : `SELECT * FROM transactions WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  findByTrackingCode: async (code) => {
    const result = await db.query(
      `SELECT * FROM v_transaction_details WHERE tracking_code = $1`,
      [code]
    );
    return result.rows[0];
  },

  findByAgentId: async (agentId, filters = {}) => {
    let query = `
      SELECT * FROM v_transaction_details 
      WHERE agent_id = $1
    `;
    const values = [agentId];
    let paramIndex = 2;
    
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
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

  findAll: async (filters = {}) => {
    let query = `SELECT * FROM v_transaction_details WHERE 1=1`;
    const values = [];
    let paramIndex = 1;
    
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }
    
    if (filters.agent_id) {
      query += ` AND agent_id = $${paramIndex++}`;
      values.push(filters.agent_id);
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

  validateByClient: async (id) => {
    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");
      
      // Vérifier que la transaction n'est pas expirée
      const transaction = await client.query(
        `SELECT * FROM transactions WHERE id = $1 AND status = 'en_attente' AND expires_at > NOW() FOR UPDATE`,
        [id]
      );
      
      if (transaction.rows.length === 0) {
        throw new Error("Transaction expirée ou introuvable");
      }
      
      const result = await client.query(
        `UPDATE transactions
         SET client_validated = true,
             status = 'validee',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      
      // Log la validation client
      await History.create({
        action_type: "transaction_client_validated",
        actor_type: "client",
        actor_id: null,
        entity_type: "transaction",
        entity_id: id,
        description: `Transaction validée par le client`,
        metadata: JSON.stringify({ transaction_id: id })
      });
      
      await client.query("COMMIT");
      return result.rows[0];
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  complete: async (id, actor) => {
    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");
      
      // Vérifier que la transaction n'a pas déjà été traitée
      const transaction = await client.query(
        `SELECT * FROM transactions WHERE id = $1 AND status = 'validee' FOR UPDATE`,
        [id]
      );
      
      if (transaction.rows.length === 0) {
        throw new Error("Transaction non disponible pour traitement");
      }
      
      // Vérifier que l'agent a le droit de traiter cette transaction
      if (actor.type === "agent") {
        const tx = transaction.rows[0];
        if (tx.assigned_agent_id !== actor.id) {
          throw new Error("Vous n'êtes pas autorisé à traiter cette transaction");
        }
      }
      
      const result = await client.query(
        `UPDATE transactions
         SET status = 'effectuee',
             processed_by_type = $1,
             processed_by_id = $2,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [actor.type, actor.id, id]
      );
      
      // Log la finalisation
      await History.create({
        action_type: "transaction_completed",
        actor_type: actor.type,
        actor_id: actor.id,
        entity_type: "transaction",
        entity_id: id,
        description: `Transaction finalisée par ${actor.type}`,
        metadata: JSON.stringify({ transaction_id: id, actor_type: actor.type })
      });
      
      await client.query("COMMIT");
      return result.rows[0];
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  cancel: async (id, actor, reason) => {
    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");
      
      const transaction = await client.query(
        `SELECT * FROM transactions WHERE id = $1 AND status IN ('en_attente', 'validee') FOR UPDATE`,
        [id]
      );
      
      if (transaction.rows.length === 0) {
        throw new Error("Transaction non annulable");
      }
      
      const result = await client.query(
        `UPDATE transactions
         SET status = 'annulee',
             cancelled_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      
      // Log l'annulation
      await History.create({
        action_type: "transaction_cancelled",
        actor_type: actor.type,
        actor_id: actor.id,
        entity_type: "transaction",
        entity_id: id,
        description: `Transaction annulée par ${actor.type}: ${reason || 'Pas de raison'}`,
        metadata: JSON.stringify({ transaction_id: id, reason })
      });
      
      await client.query("COMMIT");
      return result.rows[0];
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  expirePending: async () => {
    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");
      
      const result = await client.query(`
        UPDATE transactions
        SET status = 'expiree',
            updated_at = NOW()
        WHERE status = 'en_attente'
        AND expires_at < NOW()
        RETURNING id, tracking_code
      `);
      
      // Log les expirations
      for (const tx of result.rows) {
        await History.create({
          action_type: "transaction_expired",
          actor_type: "system",
          actor_id: null,
          entity_type: "transaction",
          entity_id: tx.id,
          description: `Transaction expirée automatiquement`,
          metadata: JSON.stringify({ transaction_id: tx.id, tracking_code: tx.tracking_code })
        });
      }
      
      await client.query("COMMIT");
      return result.rows;
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = Transaction;