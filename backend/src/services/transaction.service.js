// services/transaction.service.js
const db = require("../config/db");
const Transaction = require("../models/transaction.model");
const History = require("../models/history.model");
const { sendEmail } = require("../utils/email");
const { transactionCreatedTemplate } = require("../templates/emailTemplates");

// Sélection aléatoire d'un agent et numéro autorisé
const selectRandomAgentAndNumber = async (from_country_id, sender_method_id) => {
  const numbersRes = await db.query(
    `SELECT an.*, a.name as agent_name, a.email as agent_email, a.is_active
     FROM authorized_numbers an
     JOIN agents a ON an.agent_id = a.id
     WHERE an.country_id = $1 
     AND an.payment_method_id = $2 
     AND an.is_active = true 
     AND a.is_active = true`,
    [from_country_id, sender_method_id]
  );

  if (numbersRes.rows.length === 0) {
    throw new Error("Aucun numéro autorisé disponible pour ce pays et moyen de paiement");
  }

  const randomIndex = Math.floor(Math.random() * numbersRes.rows.length);
  const selected = numbersRes.rows[randomIndex];
  
  return {
    authorized_number_id: selected.id,
    assigned_agent_id: selected.agent_id,
    authorized_number: selected.number,
    agent_name: selected.agent_name,
    agent_email: selected.agent_email
  };
};

// Créer transaction complète
const createTransactionService = async (data) => {
  const client = await db.getClient();
  
  try {
    await client.query("BEGIN");
    
    // 1. Récupérer taux
    const rateRes = await client.query(
      `SELECT r.*, c_from.currency_id as from_currency_id, c_to.currency_id as to_currency_id
       FROM rates r
       JOIN countries c_from ON c_from.id = $1
       JOIN countries c_to ON c_to.id = $2
       WHERE r.from_currency_id = c_from.currency_id
       AND r.to_currency_id = c_to.currency_id
       AND r.is_active = true
       LIMIT 1`,
      [data.from_country_id, data.to_country_id]
    );

    const rate = rateRes.rows[0];
    if (!rate) throw new Error("Taux de change introuvable");

    // 2. Calculer montant reçu
    const receive_amount = data.send_amount * rate.rate;

    // 3. Sélection aléatoire de l'agent et du numéro
    const { authorized_number_id, assigned_agent_id, agent_name, agent_email } = 
      await selectRandomAgentAndNumber(data.from_country_id, data.sender_method_id);

    // 4. Créer transaction
    const transaction = await Transaction.create({
      ...data,
      receive_amount,
      rate_applied: rate.rate,
      commission_applied: rate.commission_percent,
      assigned_agent_id,
      authorized_number_id,
    });

    // 5. Récupérer tous les admins et semi-admins pour notification
    const adminsRes = await client.query(
      `SELECT email, 'admin' as role FROM admins WHERE is_active = true
       UNION ALL
       SELECT email, 'semi_admin' as role FROM semi_admins WHERE is_active = true`
    );

    // 6. Envoyer notifications par email
    const emailData = {
      tracking_code: transaction.tracking_code,
      send_amount: transaction.send_amount,
      receive_amount: transaction.receive_amount,
      from_country_id: data.from_country_id,
      to_country_id: data.to_country_id,
      number: await getAuthorizedNumber(authorized_number_id),
      agent_name: agent_name,
      created_at: transaction.created_at
    };

    if (agent_email) {
      await sendEmail({
        to: agent_email,
        subject: `Nouvelle transaction - ${transaction.tracking_code}`,
        html: transactionCreatedTemplate({ ...emailData, recipient_type: "agent" })
      });
    }

    for (const admin of adminsRes.rows) {
      await sendEmail({
        to: admin.email,
        subject: `Nouvelle transaction - ${transaction.tracking_code}`,
        html: transactionCreatedTemplate({ ...emailData, recipient_type: admin.role })
      });
    }

    // Log dans history
    await History.create({
      action_type: "transaction_created",
      actor_type: "client",
      actor_id: null,
      entity_type: "transaction",
      entity_id: transaction.id,
      description: `Transaction ${transaction.tracking_code} créée - Agent assigné: ${agent_name}`,
      metadata: JSON.stringify({ 
        transaction_id: transaction.id, 
        amount: transaction.send_amount,
        assigned_agent_id,
        tracking_code: transaction.tracking_code
      })
    });

    await client.query("COMMIT");
    
    return {
      ...transaction,
      authorized_number: emailData.number,
      agent_name
    };
    
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Helper pour récupérer le numéro autorisé
const getAuthorizedNumber = async (authorized_number_id) => {
  const result = await db.query(
    `SELECT number FROM authorized_numbers WHERE id = $1`,
    [authorized_number_id]
  );
  return result.rows[0]?.number;
};

// Calcul du gain générique
const calculateAgentGain = (receive_amount, commission_percent) => {
  return Math.round(parseFloat(receive_amount) * parseFloat(commission_percent) / 100);
};

// Finaliser transaction avec vérification des fonds (VERSION GÉNÉRIQUE)
const finalizeTransactionService = async (transaction_id, actor) => {
  const client = await db.getClient();

  try {
    // Ajouter un timeout pour éviter les blocages infinis
    await client.query('SET LOCAL statement_timeout = "30s"');
    
    await client.query("BEGIN");

    // 1. Récupérer transaction avec verrou et timeout
    const txResult = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE NOWAIT`,
      [transaction_id]
    );
    
    const tx = txResult.rows[0];
    if (!tx) throw new Error("Transaction introuvable");

    if (tx.status !== "validee")
      throw new Error("Transaction non validée par le client");

    // 2. Vérifier que l'agent a le droit
    if (actor.type === "agent" && tx.assigned_agent_id !== actor.id) {
      throw new Error("Vous n'êtes pas autorisé à traiter cette transaction");
    }

    // 3. Récupérer agent avec verrou
    const agentRes = await client.query(
      `SELECT * FROM agents WHERE id = $1 FOR UPDATE`,
      [tx.assigned_agent_id]
    );

    const agent = agentRes.rows[0];
    if (!agent || !agent.is_active) throw new Error("Agent inactif");
    if (!agent.can_process) throw new Error("Agent non autorisé à traiter");

    // 4. Récupérer les informations des devises
    const countriesInfo = await client.query(
      `SELECT 
        c_from.id as from_country_id, c_from.name as from_country,
        c_to.id as to_country_id, c_to.name as to_country,
        curr_from.id as from_currency_id, curr_from.code as from_currency_code, curr_from.symbol as from_currency_symbol,
        curr_to.id as to_currency_id, curr_to.code as to_currency_code, curr_to.symbol as to_currency_symbol
       FROM countries c_from
       JOIN countries c_to ON c_to.id = $2
       JOIN currencies curr_from ON curr_from.id = c_from.currency_id
       JOIN currencies curr_to ON curr_to.id = c_to.currency_id
       WHERE c_from.id = $1`,
      [tx.from_country_id, tx.to_country_id]
    );
    
    const currencyInfo = countriesInfo.rows[0];

    // 5. CRÉDITER la balance
    const creditBalanceRes = await client.query(
      `SELECT * FROM balances 
       WHERE agent_id = $1 
       AND currency_id = $2
       FOR UPDATE`,
      [agent.id, currencyInfo.from_currency_id]
    );

    if (!creditBalanceRes.rows.length) {
      throw new Error(`Balance introuvable pour la devise ${currencyInfo.from_currency_code}`);
    }

    const sendCurrencyBalance = creditBalanceRes.rows[0];
    const oldSendAmount = parseFloat(sendCurrencyBalance.amount);
    const newSendAmount = oldSendAmount + parseFloat(tx.send_amount);
    
    await client.query(
      `UPDATE balances SET amount = $1, updated_at = NOW() WHERE id = $2`,
      [newSendAmount, sendCurrencyBalance.id]
    );

    // 6. VÉRIFIER et DÉBITER la balance
    const debitBalanceRes = await client.query(
      `SELECT * FROM balances 
       WHERE agent_id = $1 
       AND currency_id = $2
       FOR UPDATE`,
      [agent.id, currencyInfo.to_currency_id]
    );

    if (!debitBalanceRes.rows.length) {
      throw new Error(`Balance introuvable pour la devise ${currencyInfo.to_currency_code}`);
    }

    const receiveCurrencyBalance = debitBalanceRes.rows[0];
    const oldReceiveAmount = parseFloat(receiveCurrencyBalance.amount);
    
    if (oldReceiveAmount < parseFloat(tx.receive_amount)) {
      throw new Error(`Fonds insuffisants en ${currencyInfo.to_currency_code}. Disponible: ${oldReceiveAmount} ${currencyInfo.to_currency_code}, requis: ${tx.receive_amount} ${currencyInfo.to_currency_code}`);
    }
    
    const newReceiveAmount = oldReceiveAmount - parseFloat(tx.receive_amount);
    
    await client.query(
      `UPDATE balances SET amount = $1, updated_at = NOW() WHERE id = $2`,
      [newReceiveAmount, receiveCurrencyBalance.id]
    );

    // 7. Calculer et enregistrer le gain
    const gain = calculateAgentGain(tx.receive_amount, tx.commission_applied);
    
    await client.query(
      `INSERT INTO gains (
        transaction_id,
        agent_id,
        currency_id,
        gain_amount,
        commission_percent_applied,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tx.id, agent.id, currencyInfo.to_currency_id, gain, tx.commission_applied]
    );

    // 8. Finaliser la transaction
    await client.query(
      `UPDATE transactions
       SET status = 'effectuee',
           processed_by_type = $1,
           processed_by_id = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [actor.type, actor.id, tx.id]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Transaction effectuée avec succès",
      data: {
        send_currency: {
          code: currencyInfo.from_currency_code,
          symbol: currencyInfo.from_currency_symbol,
          before: oldSendAmount,
          credited: parseFloat(tx.send_amount),
          after: newSendAmount
        },
        receive_currency: {
          code: currencyInfo.to_currency_code,
          symbol: currencyInfo.to_currency_symbol,
          before: oldReceiveAmount,
          debited: parseFloat(tx.receive_amount),
          after: newReceiveAmount
        },
        gain: {
          amount: gain,
          currency: currencyInfo.to_currency_code,
          currency_symbol: currencyInfo.to_currency_symbol,
          commission_rate: parseFloat(tx.commission_applied)
        }
      }
    };
    
  } catch (error) {
    await client.query("ROLLBACK");
    
    console.error(`❌ Erreur finalisation:`, error.message);
    
    // Ne pas logger si c'est juste un timeout ou nowait
    if (!error.message.includes('NOWAIT') && !error.message.includes('timeout')) {
      await History.create({
        action_type: "transaction_failed",
        actor_type: actor.type,
        actor_id: actor.id,
        entity_type: "transaction",
        entity_id: transaction_id,
        description: `Échec de finalisation: ${error.message}`,
        metadata: JSON.stringify({ error: error.message })
      }).catch(e => console.error('Log error:', e.message));
    }
    
    throw error;
  } finally {
    client.release();
  }
};

// Annuler une transaction
const cancelTransactionService = async (transaction_id, actor, reason) => {
  const tx = await Transaction.findById(transaction_id);
  
  if (!tx) throw new Error("Transaction introuvable");
  
  // Vérifier les droits
  if (actor.type === "agent" && tx.assigned_agent_id !== actor.id) {
    throw new Error("Non autorisé à annuler cette transaction");
  }
  
  if (tx.status !== "validee" && tx.status !== "en_attente") {
    throw new Error("Cette transaction ne peut pas être annulée");
  }
  
  return await Transaction.cancel(transaction_id, actor, reason);
};

module.exports = {
  createTransactionService,
  finalizeTransactionService,
  cancelTransactionService,
  selectRandomAgentAndNumber
};