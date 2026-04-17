// services/redirection.service.js
const db = require("../config/db");
const Redirection = require("../models/redirection.model");
const Transaction = require("../models/transaction.model");
const History = require("../models/history.model");
const { sendEmail } = require("../utils/email");
const { redirectionTemplate } = require("../templates/emailTemplates");

// Créer une redirection
const createRedirectionService = async (data, actor) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    // 1. Récupérer transaction avec verrou
    const tx = await Transaction.findById(data.transaction_id, true);
    if (!tx) throw new Error("Transaction introuvable");

    // Vérifier que la transaction peut être redirigée
    if (tx.status !== "validee")
      throw new Error("Transaction non redirigeable (statut: " + tx.status + ")");

    // 2. Vérifier les droits
    if (actor.type === "agent" && actor.id !== tx.assigned_agent_id) {
      throw new Error("Non autorisé à rediriger cette transaction");
    }

    // 3. Vérifier que l'agent destinataire existe et est actif
    const targetAgentRes = await client.query(
      `SELECT * FROM agents WHERE id = $1 AND is_active = true AND can_process = true`,
      [data.to_agent_id]
    );
    
    if (targetAgentRes.rows.length === 0) {
      throw new Error("Agent destinataire invalide ou inactif");
    }
    
    const targetAgent = targetAgentRes.rows[0];

    // 4. Vérifier qu'on ne redirige pas vers le même agent
    if (tx.assigned_agent_id === data.to_agent_id) {
      throw new Error("Impossible de rediriger vers le même agent");
    }

    // 5. Créer la redirection
    const redirection = await Redirection.create({
      transaction_id: tx.id,
      from_agent_id: tx.assigned_agent_id,
      to_agent_id: data.to_agent_id,
      amount: tx.receive_amount,
      reason: data.reason
    });

    // 6. Récupérer les admins pour notification
    const adminsRes = await client.query(
      `SELECT email, 'admin' as role FROM admins WHERE is_active = true
       UNION ALL
       SELECT email, 'semi_admin' as role FROM semi_admins WHERE is_active = true`
    );


    // 7. Notifier l'agent destinataire
    const emailData = {
      tracking_code: tx.tracking_code,
      amount: tx.receive_amount,
      from_agent_id: tx.assigned_agent_id,
      to_agent_id: data.to_agent_id,
      reason: data.reason,
      redirection_id: redirection.id
    };
    
    await sendEmail({
      to: targetAgent.email,
      subject: `Redirection de transaction - ${tx.tracking_code}`,
      html: redirectionTemplate({ ...emailData, recipient_type: "agent" })
    });

    // 8. Notifier les admins
    for (const admin of adminsRes.rows) {
      await sendEmail({
        to: admin.email,
        subject: `Redirection créée - ${tx.tracking_code}`,
        html: redirectionTemplate({ ...emailData, recipient_type: admin.role })
      });
    }

    // 9. Log la redirection
    await History.create({
      action_type: "redirection_created",
      actor_type: actor.type,
      actor_id: actor.id,
      entity_type: "redirection",
      entity_id: redirection.id,
      description: `Redirection de transaction ${tx.tracking_code} de l'agent ${tx.assigned_agent_id} vers ${data.to_agent_id}`,
      metadata: JSON.stringify({ 
        transaction_id: tx.id,
        from_agent: tx.assigned_agent_id,
        to_agent: data.to_agent_id,
        reason: data.reason
      })
    });

    await client.query("COMMIT");
    
    return {
      ...redirection,
      tracking_code: tx.tracking_code,
      target_agent_email: targetAgent.email
    };
    
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Accepter redirection
const acceptRedirectionService = async (redirection_id, actor) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const redir = await Redirection.findById(redirection_id);
    if (!redir) throw new Error("Redirection introuvable");

    if (redir.status !== "pending")
      throw new Error("Cette redirection a déjà été traitée");

    // Seul l'agent destinataire peut accepter
    if (actor.type === "agent" && actor.id !== redir.to_agent_id) {
      throw new Error("Non autorisé à accepter cette redirection");
    }

    // 1. Changer statut redirection
    await Redirection.updateStatus(redirection_id, "accepted");

    // 2. Réassigner la transaction
    await client.query(
      `UPDATE transactions
       SET assigned_agent_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [redir.to_agent_id, redir.transaction_id]
    );

    // 3. Log l'acceptation
    await History.create({
      action_type: "redirection_accepted",
      actor_type: actor.type,
      actor_id: actor.id,
      entity_type: "redirection",
      entity_id: redirection_id,
      description: `Redirection acceptée par l'agent ${redir.to_agent_id}`,
      metadata: JSON.stringify({ 
        redirection_id: redirection_id,
        transaction_id: redir.transaction_id
      })
    });

    await client.query("COMMIT");

    return { 
      success: true, 
      message: "Redirection acceptée avec succès",
      transaction_id: redir.transaction_id
    };
    
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Refuser redirection
const rejectRedirectionService = async (redirection_id, actor) => {
  const client = await db.getClient();
  
  try {
    await client.query("BEGIN");
    
    const redir = await Redirection.findById(redirection_id);
    if (!redir) throw new Error("Redirection introuvable");

    if (redir.status !== "pending")
      throw new Error("Cette redirection a déjà été traitée");

    if (actor.type === "agent" && actor.id !== redir.to_agent_id) {
      throw new Error("Non autorisé à refuser cette redirection");
    }

    // 1. Changer statut redirection
    await Redirection.updateStatus(redirection_id, "rejected");

    // 2. Log le refus
    await History.create({
      action_type: "redirection_rejected",
      actor_type: actor.type,
      actor_id: actor.id,
      entity_type: "redirection",
      entity_id: redirection_id,
      description: `Redirection refusée par l'agent ${redir.to_agent_id}`,
      metadata: JSON.stringify({ 
        redirection_id: redirection_id,
        transaction_id: redir.transaction_id
      })
    });

    await client.query("COMMIT");

    return { 
      success: true, 
      message: "Redirection refusée",
      transaction_id: redir.transaction_id
    };
    
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// Obtenir les redirections d'un agent
const getAgentRedirectionsService = async (agent_id, status = null) => {
  let query = `
    SELECT r.*, t.tracking_code, t.send_amount, t.receive_amount
    FROM redirections r
    JOIN transactions t ON r.transaction_id = t.id
    WHERE r.to_agent_id = $1
  `;
  const values = [agent_id];
  
  if (status) {
    query += ` AND r.status = $2`;
    values.push(status);
  }
  
  query += ` ORDER BY r.created_at DESC`;
  
  const result = await db.query(query, values);
  return result.rows;
};

module.exports = {
  createRedirectionService,
  acceptRedirectionService,
  rejectRedirectionService,
  getAgentRedirectionsService
};