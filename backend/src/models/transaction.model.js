// models/transaction.model.js
const db = require("../config/db");
const History = require("./history.model");

const Transaction = {
  // CORRECTION : accepte un client optionnel pour s'exécuter dans une transaction existante
  create: async (data, client = null) => {
    const ownClient = !client;
    if (ownClient) client = await db.getClient();

    try {
      if (ownClient) await client.query("BEGIN");

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

      // Passe le même client pour éviter un deadlock sur la row transactions
      await History.create(
        {
          action_type: "transaction_created",
          actor_type: "client",
          actor_id: null,
          entity_type: "transaction",
          entity_id: transaction.id,
          description: `Transaction créée avec code ${transaction.tracking_code}`,
          metadata: JSON.stringify({ transaction_id: transaction.id, amount: transaction.send_amount }),
        },
        client
      );

      if (ownClient) await client.query("COMMIT");
      return transaction;

    } catch (error) {
      if (ownClient) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (ownClient) client.release();
    }
  },

  findById: async (id, forUpdate = false) => {
    const query = forUpdate
      ? `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`
      : `SELECT * FROM transactions WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  findDetailedById: async (id) => {
    const query = `
      SELECT 
        t.*,
        t.client_validated,
        c_from.name as from_country_name,
        c_from.currency_id as from_currency_id,
        curr_from.code as from_currency_code,
        curr_from.symbol as from_currency_symbol,
        c_to.name as to_country_name,
        c_to.currency_id as to_currency_id,
        curr_to.code as to_currency_code,
        curr_to.symbol as to_currency_symbol,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        a.name as agent_name,
        a.email as agent_email,
        an.number as authorized_number,
        CASE 
          WHEN t.processed_by_type = 'agent' THEN ag.name
          WHEN t.processed_by_type = 'admin' THEN adm.name
          WHEN t.processed_by_type = 'semi_admin' THEN sa.name
          ELSE NULL
        END as processed_by_name
      FROM transactions t
      LEFT JOIN countries c_from ON c_from.id = t.from_country_id
      LEFT JOIN countries c_to ON c_to.id = t.to_country_id
      LEFT JOIN currencies curr_from ON curr_from.id = c_from.currency_id
      LEFT JOIN currencies curr_to ON curr_to.id = c_to.currency_id
      LEFT JOIN payment_methods sm ON sm.id = t.sender_method_id
      LEFT JOIN payment_methods rm ON rm.id = t.receiver_method_id
      LEFT JOIN agents a ON a.id = t.assigned_agent_id
      LEFT JOIN authorized_numbers an ON an.id = t.authorized_number_id
      LEFT JOIN agents ag ON ag.id = t.processed_by_id AND t.processed_by_type = 'agent'
      LEFT JOIN admins adm ON adm.id = t.processed_by_id AND t.processed_by_type = 'admin'
      LEFT JOIN semi_admins sa ON sa.id = t.processed_by_id AND t.processed_by_type = 'semi_admin'
      WHERE t.id = $1
    `;

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

  findByAgentId: async (agentId, filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  let countQuery = `
    SELECT COUNT(*) as total
    FROM v_transaction_details 
    WHERE agent_id = $1
  `;
  let dataQuery = `
    SELECT * FROM v_transaction_details 
    WHERE agent_id = $1
  `;

  // filterValues contient agentId + filtres optionnels (sans limit/offset)
  const filterValues = [agentId];
  let paramIndex = 2;

  if (filters.status) {
    countQuery += ` AND status = $${paramIndex}`;
    dataQuery  += ` AND status = $${paramIndex}`;
    filterValues.push(filters.status);
    paramIndex++;
  }

  if (filters.from_date) {
    countQuery += ` AND created_at >= $${paramIndex}`;
    dataQuery  += ` AND created_at >= $${paramIndex}`;
    filterValues.push(filters.from_date);
    paramIndex++;
  }

  if (filters.to_date) {
    countQuery += ` AND created_at <= $${paramIndex}`;
    dataQuery  += ` AND created_at <= $${paramIndex}`;
    filterValues.push(filters.to_date);
    paramIndex++;
  }

  // COUNT reçoit uniquement les filtres (pas limit/offset)
  const countResult = await db.query(countQuery, filterValues);
  const total = parseInt(countResult.rows[0].total, 10);

  // DATA reçoit filtres + pagination
  dataQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  const dataResult = await db.query(dataQuery, [...filterValues, limit, offset]);

  return {
    rows: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
  },

  findAll: async (filters = {}, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let countQuery = `SELECT COUNT(*) as total FROM v_transaction_details WHERE 1=1`;
  let dataQuery = `SELECT * FROM v_transaction_details WHERE 1=1`;
  const filterValues = []; // uniquement pour les filtres
  let paramIndex = 1;

  if (filters.status) {
    countQuery += ` AND status = $${paramIndex}`;
    dataQuery += ` AND status = $${paramIndex}`;
    filterValues.push(filters.status);
    paramIndex++;
  }

  if (filters.agent_id) {
    countQuery += ` AND agent_id = $${paramIndex}`;
    dataQuery += ` AND agent_id = $${paramIndex}`;
    filterValues.push(filters.agent_id);
    paramIndex++;
  }

  if (filters.from_date) {
    countQuery += ` AND created_at >= $${paramIndex}`;
    dataQuery += ` AND created_at >= $${paramIndex}`;
    filterValues.push(filters.from_date);
    paramIndex++;
  }

  if (filters.to_date) {
    countQuery += ` AND created_at <= $${paramIndex}`;
    dataQuery += ` AND created_at <= $${paramIndex}`;
    filterValues.push(filters.to_date);
    paramIndex++;
  }

  // Requête de comptage avec uniquement les filtres
  const countResult = await db.query(countQuery, filterValues);
  const total = parseInt(countResult.rows[0].total, 10);

  // Ajout de la pagination à la requête de données
  dataQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  const dataValues = [...filterValues, limit, offset]; // filtres + pagination
  const dataResult = await db.query(dataQuery, dataValues);
  
  return {
    rows: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
  },

  validateByClient: async (id) => {
    let result;
    try {
      const res = await db.query(
        `SELECT validate_transaction_by_client($1) AS result`,
        [id]
      );
      result = res.rows[0].result;
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("TRANSACTION_EXPIRED"))
        throw new Error("Transaction expirée ou déjà validée");
      if (msg.includes("TRANSACTION_NOT_FOUND"))
        throw new Error("Transaction introuvable");
      if (msg.includes("LOCK_CONFLICT"))
        throw new Error("Transaction en cours de traitement, réessayez dans quelques secondes");
      throw error;
    }
    return result;
  },

  complete: async (id, actor) => {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const transaction = await client.query(
        `SELECT * FROM transactions WHERE id = $1 AND status = 'validee' FOR UPDATE`,
        [id]
      );

      if (transaction.rows.length === 0) {
        throw new Error("Transaction non disponible pour traitement");
      }

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

      await History.create(
        {
          action_type: "transaction_completed",
          actor_type: actor.type,
          actor_id: actor.id,
          entity_type: "transaction",
          entity_id: id,
          description: `Transaction finalisée par ${actor.type}`,
          metadata: JSON.stringify({ transaction_id: id, actor_type: actor.type }),
        },
        client
      );

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

      await History.create(
        {
          action_type: "transaction_cancelled",
          actor_type: actor.type,
          actor_id: actor.id,
          entity_type: "transaction",
          entity_id: id,
          description: `Transaction annulée par ${actor.type}: ${reason || "Pas de raison"}`,
          metadata: JSON.stringify({ transaction_id: id, reason }),
        },
        client
      );

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

      for (const tx of result.rows) {
        await History.create(
          {
            action_type: "transaction_expired",
            actor_type: "system",
            actor_id: null,
            entity_type: "transaction",
            entity_id: tx.id,
            description: `Transaction expirée automatiquement`,
            metadata: JSON.stringify({ transaction_id: tx.id, tracking_code: tx.tracking_code }),
          },
          client
        );
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

  getStats: async () => {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(send_amount), 0) as total_send_amount,
        COALESCE(SUM(receive_amount), 0) as total_receive_amount,
        COUNT(*) FILTER (WHERE status = 'en_attente') as pending_count,
        COUNT(*) FILTER (WHERE status = 'validee') as validated_count,
        COUNT(*) FILTER (WHERE status = 'effectuee') as completed_count,
        COUNT(*) FILTER (WHERE status = 'annulee') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'expiree') as expired_count
      FROM transactions
    `;
    const result = await db.query(query);
    return result.rows[0];
  },

  getChartData: async (period, fromDate, toDate) => {
    let groupByExpr, intervalUnit;
    
    switch (period) {
      case 'day':
        groupByExpr = "to_char(created_at, 'YYYY-MM-DD HH24:00:00')";
        intervalUnit = 'hour';
        break;
      case 'week':
        groupByExpr = "to_char(created_at, 'YYYY-MM-DD')";
        intervalUnit = 'day';
        break;
      case 'month':
        groupByExpr = "to_char(created_at, 'YYYY-MM-DD')";
        intervalUnit = 'day';
        break;
      default:
        groupByExpr = "to_char(created_at, 'YYYY-MM-DD')";
        intervalUnit = 'day';
    }

    // Generate series of timestamps from fromDate to toDate
    const query = `
      WITH date_range AS (
        SELECT generate_series(
          $1::timestamp,
          $2::timestamp,
          '1 ${intervalUnit}'::interval
        ) as point
      )
      SELECT 
        to_char(dr.point, 'YYYY-MM-DD HH24:MI:SS') as period,
        COALESCE(COUNT(t.id), 0) as count,
        COALESCE(SUM(t.send_amount), 0) as total_amount
      FROM date_range dr
      LEFT JOIN transactions t ON t.created_at >= dr.point
                              AND t.created_at < dr.point + ('1 ${intervalUnit}'::interval)
      GROUP BY dr.point
      ORDER BY dr.point
    `;
    
    const result = await db.query(query, [fromDate, toDate]);
    return result.rows;
  },

  getRecentTransactions: async (limit = 5) => {
    const query = `
      SELECT * FROM v_transaction_details
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  },

  getTransactionsForExport: async (fromDate, toDate) => {
    const query = `
      SELECT * FROM v_transaction_details
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [fromDate, toDate]);
    return result.rows;
  },

  getStatusCounts: async () => {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'en_attente') AS pending,
        COUNT(*) FILTER (WHERE status = 'effectuee') AS completed,
        COUNT(*) FILTER (WHERE status = 'annulee') AS cancelled
      FROM transactions
    `;
    const result = await db.query(query);
    return result.rows[0];
  },

  getStatsByAgentId: async (agentId) => {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'validee')   AS validated_count,
        COUNT(*) FILTER (WHERE status = 'effectuee') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'annulee')   AS cancelled_count,
        COALESCE(SUM(send_amount) FILTER (WHERE status = 'effectuee'), 0) AS total_send_amount,
        COALESCE(SUM(receive_amount) FILTER (WHERE status = 'effectuee'), 0) AS total_receive_amount
      FROM transactions
      WHERE assigned_agent_id = $1
    `;
    const result = await db.query(query, [agentId]);
    return result.rows[0];
  },

  getSemiAdminCompletedPercentage: async (semiAdminId) => {
    const query = `
      SELECT
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE processed_by_id = $1 AND processed_by_type = 'semi_admin') / 
          NULLIF(COUNT(*) FILTER (WHERE status = 'effectuee'), 0),
          2
        ) AS percentage
      FROM transactions
      WHERE status = 'effectuee'
    `;
    const result = await db.query(query, [semiAdminId]);
    return parseFloat(result.rows[0].percentage) || 0;
  },

  
};

module.exports = Transaction;