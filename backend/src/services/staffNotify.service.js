// services/staffNotify.service.js — notifications push du personnel
// (remplacent les e-mails « nouvelle transaction » et « redirection »)
//
//   Événement                         Destinataires
//   Nouvelle transaction (client)     agent assigné + admins + semi-admins
//   Paiement confirmé par le client   agent assigné (c'est à lui de traiter)
//   Redirection proposée              agent destinataire + admins + semi-admins
const push = require("./push.service");

// Page d'arrivée selon l'espace de la personne notifiée
const SPACE = {
  admin: { transactions: "/admin/transactions", redirections: "/admin/transactions" },
  "semi-admin": { transactions: "/semi-admin/transactions", redirections: "/semi-admin/transactions" },
  agent: { transactions: "/agent/transactions", redirections: "/agent/redirections" },
};

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const safely = (label, promise) =>
  promise.catch((err) => console.error(`❌ push personnel (${label}):`, err.message));

// tx : ligne de v_transaction_details
const transactionCreated = (tx) => {
  // Transaction créée directement par un agent (déjà validée) : rien à signaler
  if (tx.status !== "en_attente") return Promise.resolve();
  return safely(
    "nouvelle transaction",
    push.sendToStaff({ roles: ["admin", "semi-admin"], agentIds: [tx.agent_id], event: "new_transaction" }, (role) => ({
      title: "Nouvelle transaction",
      body: `${fmt(tx.send_amount)} ${tx.from_currency_code} → ${fmt(tx.receive_amount)} ${tx.to_currency_code} · ${tx.sender_method} · ${tx.tracking_code}`,
      link: SPACE[role].transactions,
      tag: `staff-trx-${tx.tracking_code}`,
    }))
  );
};

const paymentConfirmed = (tx) =>
  safely(
    "paiement confirmé",
    push.sendToStaff({ agentIds: [tx.agent_id], event: "payment_confirmed" }, (role) => ({
      title: "Paiement confirmé · à traiter",
      body: `${tx.tracking_code} · ${fmt(tx.send_amount)} ${tx.from_currency_code} reçus via ${tx.sender_method}. Envoyez ${fmt(tx.receive_amount)} ${tx.to_currency_code} par ${tx.receiver_method}.`,
      link: SPACE[role].transactions,
      tag: `staff-trx-${tx.tracking_code}`,
    }))
  );

// result : retour de create_redirection ; reason : motif saisi
const redirectionCreated = (result, reason) =>
  safely(
    "redirection",
    push.sendToStaff({ roles: ["admin", "semi-admin"], agentIds: [result.target_agent?.id], event: "redirection" }, (role) => ({
      title: role === "agent" ? "Transaction redirigée vers vous" : "Redirection proposée",
      body: `${result.tracking_code} · ${fmt(result.receive_amount)} à payer${reason ? ` · « ${String(reason).slice(0, 80)} »` : ""}${role === "agent" ? " · acceptez ou refusez" : ""}`,
      link: SPACE[role].redirections,
      tag: `staff-redir-${result.redirection?.id}`,
    }))
  );

module.exports = { transactionCreated, paymentConfirmed, redirectionCreated };
