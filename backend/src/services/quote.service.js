// services/quote.service.js
// Devis en direct pour l'envoi rapide (cahier V2 · TRX-01).
// Utilise compute_transfer_amounts / compute_sending_fee : exactement le même
// calcul que create_transaction, donc le montant affiché = le montant final.
const db = require("../config/db");

const getQuote = async ({ from_country_id, to_country_id, sender_method_id, receiver_method_id, amount }) => {
  const sendAmount = parseFloat(amount);
  if (!from_country_id || !to_country_id || !sender_method_id) {
    throw Object.assign(new Error("Paramètres manquants"), { status: 400 });
  }
  if (!(sendAmount > 0)) {
    throw Object.assign(new Error("Montant invalide"), { status: 400 });
  }

  const { rows } = await db.query(
    `SELECT r.rate,
            cf.code AS from_code, cf.symbol AS from_symbol,
            ct.code AS to_code,   ct.symbol AS to_symbol,
            pm.id   AS sender_method_ok
     FROM countries c_from
     JOIN countries c_to       ON c_to.id = $2
     JOIN currencies cf        ON cf.id = c_from.currency_id
     JOIN currencies ct        ON ct.id = c_to.currency_id
     LEFT JOIN rates r         ON r.from_currency_id = cf.id AND r.to_currency_id = ct.id
                              AND r.is_active = true AND r.deleted_at IS NULL
     LEFT JOIN payment_methods pm ON pm.id = $3 AND pm.country_id = c_from.id AND pm.is_active = true
     WHERE c_from.id = $1`,
    [from_country_id, to_country_id, sender_method_id]
  );
  const row = rows[0];
  if (!row) throw Object.assign(new Error("Pays invalide"), { status: 400 });
  if (!row.sender_method_ok) throw Object.assign(new Error("Moyen d'envoi invalide pour ce pays"), { status: 400 });
  if (!row.rate) throw Object.assign(new Error("Taux de change introuvable pour cette paire de pays"), { status: 404 });

  const calc = await db.query(
    `SELECT * FROM compute_transfer_amounts($1, $2, $3)`,
    [sendAmount, sender_method_id, row.rate]
  );
  const c = calc.rows[0];

  return {
    send_amount: sendAmount,
    withdrawal_fee_percent: parseFloat(c.fee_percent),
    withdrawal_fee_amount: parseFloat(c.fee_amount),
    net_send_amount: parseFloat(c.net_amount),
    receive_amount: parseFloat(c.receive_amount),
    rate: parseFloat(row.rate),
    from_currency: { code: row.from_code, symbol: row.from_symbol },
    to_currency: { code: row.to_code, symbol: row.to_symbol },
  };
};

module.exports = { getQuote };
