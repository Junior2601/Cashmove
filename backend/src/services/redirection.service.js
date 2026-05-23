// services/redirection.service.js
//
// Les 3 fonctions métier (create / accept / reject) sont désormais
// des fonctions PL/pgSQL atomiques côté PostgreSQL, exactement comme
// validate_transaction_by_client.
//
// Node.js se charge uniquement de :
//   1. Appeler la fonction SQL via db.query (une seule requête, pas de
//      BEGIN/COMMIT géré ici — PostgreSQL s'en occupe)
//   2. Envoyer les emails APRÈS que la DB a commité (fire-and-forget)
//   3. Parser les erreurs métier remontées par RAISE EXCEPTION

const db = require("../config/db");
const { sendEmail } = require("../utils/email");
const { redirectionTemplate } = require("../templates/emailTemplates");

// ─── Parseur d'erreurs métier ──────────────────────────────────────────────
// Les fonctions SQL lèvent des exceptions sous la forme "CODE: message".
// On les traduit en erreurs JS lisibles.
function parseDbError(err) {
  const raw = err.message || "";

  const knownCodes = [
    "TRANSACTION_NOT_FOUND",
    "TRANSACTION_NOT_REDIRECTABLE",
    "UNAUTHORIZED",
    "SAME_AGENT",
    "AGENT_NOT_FOUND",
    "LOCK_CONFLICT",
    "REDIRECTION_NOT_FOUND",
    "REDIRECTION_ALREADY_PROCESSED",
  ];

  for (const code of knownCodes) {
    if (raw.includes(code + ":")) {
      const message = raw.split(code + ":")[1]?.trim() || raw;
      return new Error(message);
    }
  }

  return err;
}

// ─── 1. Créer une redirection ──────────────────────────────────────────────
const createRedirectionService = async (data, actor) => {
  let result;

  try {
    const res = await db.query(
      `SELECT create_redirection($1, $2, $3, $4, $5) AS payload`,
      [
        data.transaction_id,
        data.to_agent_id,
        data.reason || null,
        actor.id,
        actor.type,
      ]
    );
    result = res.rows[0].payload;
  } catch (err) {
    throw parseDbError(err);
  }

  // DB a commité — emails en fire-and-forget (n'impactent pas la réponse HTTP)
  const emailData = {
    tracking_code:  result.tracking_code,
    amount:         result.receive_amount,
    from_agent_id:  result.from_agent_id,
    to_agent_id:    data.to_agent_id,
    reason:         data.reason,
    redirection_id: result.redirection.id,
  };

  Promise.all([
    sendEmail({
      to:      result.target_agent.email,
      subject: `Redirection de transaction - ${result.tracking_code}`,
      html:    redirectionTemplate({ ...emailData, recipient_type: "agent" }),
    }),
    ...result.admins.map((admin) =>
      sendEmail({
        to:      admin.email,
        subject: `Redirection créée - ${result.tracking_code}`,
        html:    redirectionTemplate({ ...emailData, recipient_type: admin.role }),
      })
    ),
  ]).catch((emailErr) => {
    console.error("⚠️  Erreur envoi email redirection (non bloquant):", emailErr.message);
  });

  return {
    ...result.redirection,
    tracking_code:      result.tracking_code,
    target_agent_email: result.target_agent.email,
  };
};

// ─── 2. Accepter une redirection ───────────────────────────────────────────
const acceptRedirectionService = async (redirection_id, actor) => {
  try {
    const res = await db.query(
      `SELECT accept_redirection($1, $2, $3) AS payload`,
      [redirection_id, actor.id, actor.type]
    );
    return res.rows[0].payload;
  } catch (err) {
    throw parseDbError(err);
  }
};

// ─── 3. Refuser une redirection ────────────────────────────────────────────
const rejectRedirectionService = async (redirection_id, actor) => {
  try {
    const res = await db.query(
      `SELECT reject_redirection($1, $2, $3) AS payload`,
      [redirection_id, actor.id, actor.type]
    );
    return res.rows[0].payload;
  } catch (err) {
    throw parseDbError(err);
  }
};

// ─── 4. Lister les redirections d'un agent ────────────────────────────────
const getAgentRedirectionsService = async (agent_id, status = null) => {
  let query = `
    SELECT
      r.*,
      t.tracking_code,
      t.send_amount,
      t.receive_amount,
      t.status        AS transaction_status,
      fa.name         AS from_agent_name,
      fa.email        AS from_agent_email
    FROM redirections r
    JOIN transactions t ON r.transaction_id = t.id
    JOIN agents fa      ON r.from_agent_id  = fa.id
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
  getAgentRedirectionsService,
};