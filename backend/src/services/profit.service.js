// services/profit.service.js
const db = require("../config/db");

// Prendre un snapshot manuel (utile pour forcer un snapshot end_of_day)
const takeSnapshotService = async (type) => {
  if (!["start_of_day", "end_of_day"].includes(type)) {
    throw new Error("Type invalide : start_of_day ou end_of_day");
  }
  const res = await db.query(
    `SELECT take_balance_snapshot($1) AS result`,
    [type]
  );
  return res.rows[0].result;
};

// Récupérer le bénéfice sur une période
const getProfitService = async (period, date) => {
  const validPeriods = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    throw new Error("Période invalide : day, week ou month");
  }

  // Valider la date si fournie
  const targetDate = date || new Date().toISOString().split("T")[0];
  if (isNaN(Date.parse(targetDate))) {
    throw new Error("Date invalide, format attendu : YYYY-MM-DD");
  }

  const res = await db.query(
    `SELECT get_profit($1, $2::DATE) AS result`,
    [period, targetDate]
  );

  const result = res.rows[0].result;

  // Traduire les codes d'erreur PostgreSQL
  return result;
};

// Récupérer le snapshot courant des balances (valeur actuelle en temps réel)
const getCurrentBalancesService = async () => {
  const res = await db.query(`
    SELECT
      a.id          AS agent_id,
      a.name        AS agent_name,
      c.code        AS currency,
      c.symbol      AS currency_symbol,
      b.amount,
      -- Taux interne (taux client + 0.20) pour info
      CASE
        WHEN c.code = 'RUB' THEN 1
        ELSE NULL
      END AS rate_client,
      CASE
        WHEN c.code = 'RUB' THEN 1
        ELSE r.rate + 0.20
      END AS rate_internal,
      -- Valeur en RUB
      CASE
        WHEN c.code = 'RUB' THEN b.amount
        WHEN r.rate IS NOT NULL THEN ROUND(b.amount / (r.rate + 0.20), 2)
        ELSE NULL
      END AS amount_rub,
      b.last_updated
    FROM balances b
    JOIN agents     a ON a.id = b.agent_id AND a.deleted_at IS NULL
    JOIN currencies c ON c.id = b.currency_id
    LEFT JOIN rates r ON r.to_currency_id = b.currency_id
      AND r.from_currency_id = (SELECT id FROM currencies WHERE code = 'RUB')
      AND r.is_active = true
    WHERE b.amount >= 0
    ORDER BY a.name, c.code
  `);

  const rows = res.rows;

  // Agréger par agent
  const byAgent = {};
  let grandTotalRub = 0;

  for (const row of rows) {
    if (!byAgent[row.agent_id]) {
      byAgent[row.agent_id] = {
        agent_id:   row.agent_id,
        agent_name: row.agent_name,
        balances:   [],
        total_rub:  0,
      };
    }
    const amountRub = parseFloat(row.amount_rub) || 0;
    byAgent[row.agent_id].balances.push({
      currency:       row.currency,
      currency_symbol: row.currency_symbol,
      amount:         parseFloat(row.amount),
      rate_internal:  row.rate_internal ? parseFloat(row.rate_internal) : null,
      amount_rub:     amountRub,
      last_updated:   row.last_updated,
    });
    byAgent[row.agent_id].total_rub += amountRub;
    grandTotalRub += amountRub;
  }

  return {
    agents:          Object.values(byAgent),
    grand_total_rub: Math.round(grandTotalRub * 100) / 100,
    computed_at:     new Date().toISOString(),
  };
};

module.exports = {
  takeSnapshotService,
  getProfitService,
  getCurrentBalancesService,
};