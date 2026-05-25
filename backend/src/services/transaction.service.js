// services/transaction.service.js
const db = require("../config/db");
const Transaction = require("../models/transaction.model");
const History = require("../models/history.model");
const { sendEmail } = require("../utils/email");
const { transactionCreatedTemplate } = require("../templates/emailTemplates");

const createTransactionService = async (data) => {
  let result;
  try {
    const res = await db.query(
      `SELECT create_transaction($1, $2, $3, $4, $5, $6, $7) AS result`,
      [
        data.from_country_id,
        data.to_country_id,
        data.sender_phone,
        data.receiver_phone,
        data.sender_method_id,
        data.receiver_method_id,
        data.send_amount,
      ]
    );
    result = res.rows[0].result;
  } catch (error) {
    const msg = error.message || "";
    console.error("❌ create_transaction error:", msg);

    if (msg.includes("RATE_NOT_FOUND"))
      throw new Error("Taux de change introuvable pour cette paire de pays");
    if (msg.includes("NO_AGENT_AVAILABLE"))
      throw new Error("Aucun agent disponible pour ce pays et moyen de paiement");

    throw error;
  }

  const { transaction, agent, authorized_number } = result;

  const adminsRes = await db.query(
    `SELECT email, 'admin' as role FROM admins WHERE is_active = true
     UNION ALL
     SELECT email, 'semi-admin' as role FROM semi_admins WHERE is_active = true`
  );

  const emailData = {
    tracking_code:   transaction.tracking_code,
    send_amount:     transaction.send_amount,
    receive_amount:  transaction.receive_amount,
    from_country_id: data.from_country_id,
    to_country_id:   data.to_country_id,
    number:          authorized_number,
    agent_name:      agent.name,
    created_at:      transaction.created_at,
  };

  if (agent.email) {
    await sendEmail({
      to: agent.email,
      subject: `Nouvelle transaction - ${transaction.tracking_code}`,
      html: transactionCreatedTemplate({ ...emailData, recipient_type: "agent" }),
    }).catch((e) => console.error("Email agent error:", e.message));
  }

  for (const admin of adminsRes.rows) {
    await sendEmail({
      to: admin.email,
      subject: `Nouvelle transaction - ${transaction.tracking_code}`,
      html: transactionCreatedTemplate({ ...emailData, recipient_type: admin.role }),
    }).catch((e) => console.error("Email admin error:", e.message));
  }

  return {
    ...transaction,
    authorized_number,
    agent_name: agent.name,
  };
};

const finalizeTransactionService = async (transaction_id, actor) => {
  let result;
  try {
    const res = await db.query(
      `SELECT finalize_transaction($1, $2, $3) AS result`,
      [transaction_id, actor.type, actor.id]
    );
    result = res.rows[0].result;
  } catch (error) {
    const msg = error.message || "";
    console.error("❌ finalize_transaction error:", msg);

    if (msg.includes("LOCK_CONFLICT"))
      throw new Error("Transaction en cours de traitement, réessayez dans quelques secondes");
    if (msg.includes("TRANSACTION_NOT_FOUND"))
      throw new Error("Transaction introuvable");
    if (msg.includes("TRANSACTION_NOT_VALIDATED"))
      throw new Error("Transaction non validée par le client");
    if (msg.includes("AGENT_NOT_AUTHORIZED"))
      throw new Error("Vous n'êtes pas autorisé à traiter cette transaction");
    if (msg.includes("AGENT_INACTIVE"))
      throw new Error("Agent inactif");
    if (msg.includes("AGENT_CANNOT_PROCESS"))
      throw new Error("Agent non autorisé à traiter");
    if (msg.includes("CURRENCIES_NOT_FOUND"))
      throw new Error("Devises introuvables pour ces pays");
    if (msg.includes("BALANCE_NOT_FOUND"))
      throw new Error("Balance introuvable pour cet agent");
    if (msg.includes("INSUFFICIENT_FUNDS"))
      throw new Error(msg.replace("ERROR: ", "").replace("INSUFFICIENT_FUNDS: ", "Fonds insuffisants : "));

    await History.create({
      action_type: "transaction_failed",
      actor_type: actor.type,
      actor_id: actor.id,
      entity_type: "transaction",
      entity_id: transaction_id,
      description: `Échec de finalisation: ${msg}`,
      metadata: JSON.stringify({ error: msg }),
    }).catch((e) => console.error("Log error:", e.message));

    throw error;
  }

  return {
    success: true,
    message: "Transaction effectuée avec succès",
    data: result,
  };
};

const cancelTransactionService = async (transaction_id, actor, reason) => {
  const tx = await Transaction.findById(transaction_id);

  if (!tx) throw new Error("Transaction introuvable");

  if (actor.type === "agent" && tx.assigned_agent_id !== actor.id) {
    throw new Error("Non autorisé à annuler cette transaction");
  }

  if (tx.status !== "validee" && tx.status !== "en_attente") {
    throw new Error("Cette transaction ne peut pas être annulée");
  }

  return await Transaction.cancel(transaction_id, actor, reason);
};

// Créer une transaction agent (assignée directement + validée d'office)
const createAgentTransactionService = async (agentId, data) => {
  let result;
  try {
    const res = await db.query(
      `SELECT create_agent_transaction($1, $2, $3, $4, $5, $6, $7, $8) AS result`,
      [
        agentId,
        data.from_country_id,
        data.to_country_id,
        data.sender_phone,
        data.receiver_phone,
        data.sender_method_id,
        data.receiver_method_id,
        data.send_amount,
      ]
    );
    result = res.rows[0].result;
  } catch (error) {
    const msg = error.message || "";
    console.error("❌ create_agent_transaction error:", msg);

    if (msg.includes("AGENT_INACTIVE"))
      throw new Error("Agent inactif ou introuvable");
    if (msg.includes("CURRENCIES_NOT_FOUND"))
      throw new Error("Devises introuvables pour ces pays");
    if (msg.includes("RATE_NOT_FOUND"))
      throw new Error("Taux de change introuvable pour cette paire de pays");
    if (msg.includes("LOCK_CONFLICT"))
      throw new Error("Ressource en cours de traitement, réessayez dans quelques secondes");

    throw error;
  }

  return result;
};

const getDashboardStats = async () => {
  return await Transaction.getStats();
};

const getChartData = async (period, from, to) => {
  const validPeriods = ['day', 'week', 'month'];
  let normalizedPeriod = period ? period.toLowerCase().trim() : 'week';
  
  if (!validPeriods.includes(normalizedPeriod)) {
    throw new Error('Period must be day, week, or month');
  }

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date();
  if (!from) fromDate.setDate(toDate.getDate() - 30);

  const start = new Date(Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()));
  const end = new Date(Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59));

  return await Transaction.getChartData(normalizedPeriod, start, end);
};

const getRecentTransactions = async (limit = 5) => {
  const lim = parseInt(limit, 10);
  if (isNaN(lim) || lim < 1) throw new Error('Invalid limit');
  return await Transaction.getRecentTransactions(lim);
};

const exportTransactions = async (fromDate, toDate) => {
  if (!fromDate || !toDate) throw new Error('fromDate and toDate are required');
  const rows = await Transaction.getTransactionsForExport(fromDate, toDate);
  return rows;
};

const getTransactionCounts = async () => {
  return await Transaction.getStatusCounts();
};

const getSemiAdminShare = async (semiAdminId) => {
  return await Transaction.getSemiAdminCompletedPercentage(semiAdminId);
};

const getAgentStats = async (agentId) => {
  return await Transaction.getStatsByAgentId(agentId);
};

const getLastFiveTransactions = async () => {
  return await Transaction.getRecentTransactions(5);
};

module.exports = {
  createTransactionService,
  finalizeTransactionService,
  cancelTransactionService,
  createAgentTransactionService,
  getDashboardStats,
  getChartData,
  getRecentTransactions,
  exportTransactions,
  getTransactionCounts,
  getSemiAdminShare,
  getAgentStats,
  getLastFiveTransactions,
};