// services/profit.service.js
// Règles de calcul : migration 006_profit_rules.sql (une seule source de vérité en SQL)
//
//   Taux interne      1 RUB = (taux client RUB→devise + 0,20) devise   — profit_spread()
//   Par transaction   marge brute = valeur RUB encaissée − valeur RUB décaissée
//                     bénéfice net = marge brute − commission de l'agent
//                     (figé dans transaction_profits quand la transaction est effectuée)
//   Par jour          bénéfice = somme des bénéfices nets des transactions du jour
//                     contrôle = variation des soldes − apports nets de l'admin
//
// Les dates « du jour » sont celles de la base (fuseau Africa/Nairobi), jamais
// celles du serveur Node (UTC sur Render).
const db = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const toFloat = (v, fallback = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};
const toFloatOrNull = (v) => (v === null || v === undefined ? null : toFloat(v));
const round2 = (n) => Math.round(n * 100) / 100;

// Date du jour selon la base (Africa/Nairobi)
const todayInDb = async () => {
  const { rows } = await db.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS d`);
  return rows[0].d;
};

const normalizeDay = (d) => {
  const profit = toFloatOrNull(d.profit_rub);
  return {
    date:               d.date || d.day || null,
    start_balance_rub:  toFloatOrNull(d.start_balance_rub ?? d.start_rub),
    end_balance_rub:    toFloatOrNull(d.end_balance_rub ?? d.end_rub),
    net_deposits_rub:   toFloat(d.net_deposits_rub),
    balance_profit_rub: toFloatOrNull(d.balance_profit_rub),
    transactions_count: toFloat(d.transactions_count ?? d.tx_count),
    gross_margin_rub:   toFloat(d.gross_margin_rub),
    commission_rub:     toFloat(d.commission_rub),
    profit_rub:         profit,
    is_profit:          profit === null ? null : profit >= 0,
  };
};

// Normalise la réponse JSONB de get_profit() en objet JS propre
const normalizeProfit = (raw) => {
  const r = raw && typeof raw === "object" ? raw : {};
  const total = toFloat(r.total_profit_rub);
  return {
    period:             r.period || null,
    from:               r.from || null,
    to:                 r.to || null,
    start_balance_rub:  toFloat(r.start_balance_rub),
    end_balance_rub:    toFloat(r.end_balance_rub),
    total_profit_rub:   total,                       // bénéfice net des transactions
    is_profit:          total >= 0,
    transactions_count: toFloat(r.transactions_count),
    gross_margin_rub:   toFloat(r.gross_margin_rub),
    commission_rub:     toFloat(r.commission_rub),
    incomplete_count:   toFloat(r.incomplete_count),  // transactions sans taux RUB pour une devise
    balance_profit_rub: toFloatOrNull(r.balance_profit_rub),
    net_deposits_rub:   toFloat(r.net_deposits_rub),
    days:               Array.isArray(r.days) ? r.days.map(normalizeDay) : [],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT MANUEL
// ─────────────────────────────────────────────────────────────────────────────

const takeSnapshotService = async (type) => {
  if (!["start_of_day", "end_of_day"].includes(type)) {
    throw new Error("Type invalide : start_of_day ou end_of_day");
  }
  const res = await db.query(`SELECT take_balance_snapshot($1) AS result`, [type]);
  const result = res.rows[0].result;
  return {
    type,
    taken_at:   new Date().toISOString(),
    total_rub:  toFloat(result?.total_rub),
    nb_entries: result?.nb_entries ?? 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFIT PAR PÉRIODE
// ─────────────────────────────────────────────────────────────────────────────

const getProfitService = async (period, date) => {
  if (!["day", "week", "month"].includes(period)) {
    throw new Error("Période invalide : day, week ou month");
  }
  const targetDate = date || (await todayInDb());
  if (isNaN(Date.parse(targetDate))) {
    throw new Error("Date invalide, format attendu : YYYY-MM-DD");
  }
  const res = await db.query(`SELECT get_profit($1, $2::DATE) AS result`, [period, targetDate]);
  return normalizeProfit(res.rows[0].result);
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIQUE — N derniers jours (même règle que la période : profit_days)
// ─────────────────────────────────────────────────────────────────────────────

const getProfitHistoryService = async (limit = 30) => {
  const n = Math.min(Math.max(parseInt(limit) || 30, 1), 90);
  const res = await db.query(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, start_rub, end_rub, net_deposits_rub, balance_profit_rub,
            tx_count, gross_margin_rub, commission_rub, profit_rub
     FROM profit_days(CURRENT_DATE - ($1::INT - 1), CURRENT_DATE)`,
    [n]
  );

  const days = res.rows.map((row) => ({
    ...normalizeDay(row),
    is_complete: row.end_rub !== null,
  }));

  // Un jour compte s'il a eu des transactions ou des relevés de soldes
  const active      = days.filter((d) => d.transactions_count > 0 || d.start_balance_rub !== null);
  const totalProfit = active.reduce((s, d) => s + (d.profit_rub ?? 0), 0);
  const profitDays  = active.filter((d) => (d.profit_rub ?? 0) >= 0).length;
  const lossDays    = active.filter((d) => (d.profit_rub ?? 0) < 0).length;
  const bestDay     = active.reduce((b, d) => (!b || d.profit_rub > b.profit_rub ? d : b), null);
  const worstDay    = active.reduce((w, d) => (!w || d.profit_rub < w.profit_rub ? d : w), null);

  return {
    days,
    summary: {
      total_days:       days.length,
      complete_days:    active.length,
      total_profit_rub: round2(totalProfit),
      is_profit:        totalProfit >= 0,
      profit_days:      profitDays,
      loss_days:        lossDays,
      win_rate:         active.length > 0 ? Math.round((profitDays / active.length) * 100) : 0,
      best_day:  bestDay  ? { date: bestDay.date,  profit_rub: bestDay.profit_rub  } : null,
      worst_day: worstDay ? { date: worstDay.date, profit_rub: worstDay.profit_rub } : null,
    },
    computed_at: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BALANCES ACTUELLES + résultat du jour en cours
// ─────────────────────────────────────────────────────────────────────────────

const getCurrentBalancesService = async () => {
  // 1. Soldes en temps réel, valorisés au taux interne (rub_value)
  const balancesRes = await db.query(`
    SELECT
      a.id    AS agent_id,
      a.name  AS agent_name,
      c.code  AS currency,
      c.symbol AS currency_symbol,
      b.amount,
      internal_rate_from_rub(b.currency_id) AS rate_internal,
      rub_value(b.amount, b.currency_id)    AS amount_rub,
      b.last_updated
    FROM balances b
    JOIN agents     a ON a.id = b.agent_id AND a.deleted_at IS NULL
    JOIN currencies c ON c.id = b.currency_id
    WHERE b.amount >= 0 AND b.deleted_at IS NULL
    ORDER BY a.name, c.code
  `);

  // 2. Début de journée (date de la base) et apports de l'admin depuis
  const dayRes = await db.query(`
    SELECT
      (SELECT total_rub FROM balance_snapshots
        WHERE snapshot_type = 'start_of_day' AND snapshot_date = CURRENT_DATE) AS start_rub,
      (SELECT COALESCE(SUM(CASE WHEN bt.type = 'credit' THEN 1 ELSE -1 END * rub_value(bt.amount, b.currency_id)), 0)
         FROM balance_transactions bt JOIN balances b ON b.id = bt.balance_id
        WHERE bt.created_at::DATE = CURRENT_DATE) AS deposits_rub
  `);
  const startOfDayRub = toFloatOrNull(dayRes.rows[0].start_rub);
  const depositsToday = toFloat(dayRes.rows[0].deposits_rub);

  // 3. Agréger par agent
  const byAgent = {};
  let grandTotalRub = 0;
  const missingRates = new Set();

  for (const row of balancesRes.rows) {
    if (!byAgent[row.agent_id]) {
      byAgent[row.agent_id] = { agent_id: row.agent_id, agent_name: row.agent_name, balances: [], total_rub: 0 };
    }
    const amountRub = toFloatOrNull(row.amount_rub);
    if (amountRub === null && toFloat(row.amount) > 0) missingRates.add(row.currency);
    byAgent[row.agent_id].balances.push({
      currency:        row.currency,
      currency_symbol: row.currency_symbol,
      amount:          toFloat(row.amount),
      rate_internal:   toFloatOrNull(row.rate_internal),
      amount_rub:      amountRub,
      last_updated:    row.last_updated,
    });
    byAgent[row.agent_id].total_rub += amountRub ?? 0;
    grandTotalRub += amountRub ?? 0;
  }
  grandTotalRub = round2(grandTotalRub);

  // 4. Résultat du jour en cours = variation des soldes − apports de l'admin
  const unrealizedProfit = startOfDayRub !== null ? round2(grandTotalRub - startOfDayRub - depositsToday) : null;

  return {
    agents: Object.values(byAgent).map((a) => ({ ...a, total_rub: round2(a.total_rub) })),
    grand_total_rub:       grandTotalRub,
    start_of_day_rub:      startOfDayRub,
    net_deposits_today_rub: round2(depositsToday),
    unrealized_profit_rub: unrealizedProfit,
    unrealized_is_profit:  unrealizedProfit === null ? null : unrealizedProfit >= 0,
    missing_rates:         [...missingRates],   // devises sans taux RUB : non valorisées
    computed_at:           new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFIT PAR TRANSACTION (figé dans transaction_profits)
// ─────────────────────────────────────────────────────────────────────────────

const getTransactionProfitsService = async ({ date, limit = 50 }) => {
  const targetDate = date || (await todayInDb());
  const max = Math.min(Math.max(parseInt(limit) || 50, 1), 500);

  const [listRes, totalRes] = await Promise.all([
    db.query(
      `SELECT
         t.id, t.tracking_code, t.send_amount, t.receive_amount, t.rate_applied, t.commission_applied,
         t.withdrawal_fee_amount, t.sending_fee_amount, t.completed_at, t.created_at,
         cf.name AS from_country, curr_from.code AS from_currency, curr_from.symbol AS from_symbol,
         ct.name AS to_country,   curr_to.code   AS to_currency,   curr_to.symbol   AS to_symbol,
         a.name AS agent_name,
         p.send_value_rub, p.payout_value_rub, p.withdrawal_fee_rub, p.sending_fee_rub,
         p.gross_margin_rub, p.commission_rub, p.net_profit_rub, p.complete,
         g.gain_amount, curr_gain.code AS gain_currency, curr_gain.symbol AS gain_symbol
       FROM transactions t
       JOIN countries  cf        ON cf.id = t.from_country_id
       JOIN countries  ct        ON ct.id = t.to_country_id
       JOIN currencies curr_from ON curr_from.id = cf.currency_id
       JOIN currencies curr_to   ON curr_to.id   = ct.currency_id
       LEFT JOIN agents a        ON a.id = t.assigned_agent_id
       LEFT JOIN transaction_profits p ON p.transaction_id = t.id
       LEFT JOIN gains g         ON g.transaction_id = t.id
       LEFT JOIN currencies curr_gain ON curr_gain.id = g.currency_id
       WHERE t.status = 'effectuee' AND t.completed_at::DATE = $1::DATE
       ORDER BY t.completed_at DESC
       LIMIT $2`,
      [targetDate, max]
    ),
    // Totaux sur TOUTE la journée (pas seulement les lignes affichées)
    db.query(
      `SELECT COUNT(*)::INT AS count,
              COALESCE(SUM(p.net_profit_rub), 0)   AS net,
              COALESCE(SUM(p.gross_margin_rub), 0) AS gross,
              COALESCE(SUM(p.commission_rub), 0)   AS commission,
              COUNT(*) FILTER (WHERE p.complete IS NOT TRUE)::INT AS incomplete
       FROM transactions t
       LEFT JOIN transaction_profits p ON p.transaction_id = t.id
       WHERE t.status = 'effectuee' AND t.completed_at::DATE = $1::DATE`,
      [targetDate]
    ),
  ]);

  const transactions = listRes.rows.map((row) => ({
    id:                 row.id,
    tracking_code:      row.tracking_code,
    from_country:       row.from_country,
    to_country:         row.to_country,
    from_currency:      row.from_currency,
    from_symbol:        row.from_symbol,
    to_currency:        row.to_currency,
    to_symbol:          row.to_symbol,
    send_amount:        toFloat(row.send_amount),
    receive_amount:     toFloat(row.receive_amount),
    rate_applied:       toFloat(row.rate_applied),
    commission_applied: toFloat(row.commission_applied),
    send_value_rub:     toFloatOrNull(row.send_value_rub),
    payout_value_rub:   toFloatOrNull(row.payout_value_rub),
    withdrawal_fee_rub: toFloatOrNull(row.withdrawal_fee_rub),
    sending_fee_rub:    toFloatOrNull(row.sending_fee_rub),
    gross_margin_rub:   toFloatOrNull(row.gross_margin_rub),
    commission_rub:     toFloatOrNull(row.commission_rub),
    profit_rub:         toFloatOrNull(row.net_profit_rub),   // bénéfice net
    complete:           row.complete !== false,
    gain_amount:        row.gain_amount ? toFloat(row.gain_amount) : null,   // devise d'origine
    gain_currency:      row.gain_currency || null,
    gain_symbol:        row.gain_symbol || null,
    agent_name:         row.agent_name || "—",
    completed_at:       row.completed_at,
  }));

  const t = totalRes.rows[0];
  return {
    date: targetDate,
    transactions,
    summary: {
      count:             t.count,
      shown:             transactions.length,
      total_profit_rub:  round2(toFloat(t.net)),          // bénéfice net
      gross_margin_rub:  round2(toFloat(t.gross)),
      total_gain_rub:    round2(toFloat(t.commission)),   // commissions agents, en RUB
      incomplete_count:  t.incomplete,
    },
    computed_at: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  takeSnapshotService,
  getProfitService,
  getProfitHistoryService,
  getCurrentBalancesService,
  getTransactionProfitsService,
};
