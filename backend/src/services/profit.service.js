// services/profit.service.js
const db = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const toFloat = (v, fallback = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

// Normalise la réponse JSONB de get_profit() en objet JS propre.
// Champs garantis : period, from, to, start_balance_rub, end_balance_rub,
//                   total_profit_rub, is_profit, days[]
const normalizeProfit = (raw) => {
  if (!raw || typeof raw !== "object") {
    return {
      period: null,
      from: null,
      to: null,
      start_balance_rub: 0,
      end_balance_rub: 0,
      total_profit_rub: 0,
      is_profit: true,
      days: [],
    };
  }

  // Normalise chaque entrée journalière
  const rawDays = Array.isArray(raw.days) ? raw.days : [];
  const days = rawDays.map((d) => {
    const profitRub = d.profit_rub !== null && d.profit_rub !== undefined
      ? toFloat(d.profit_rub)
      : null;
    return {
      date:              d.date || null,
      start_balance_rub: toFloat(d.start_balance_rub),
      end_balance_rub:   toFloat(d.end_balance_rub),
      profit_rub:        profitRub,
      is_profit:         profitRub === null ? null : profitRub >= 0,
    };
  });

  const totalProfit = toFloat(raw.total_profit_rub);

  return {
    period:            raw.period || null,
    from:              raw.from || null,
    to:                raw.to || null,
    start_balance_rub: toFloat(raw.start_balance_rub),
    end_balance_rub:   toFloat(raw.end_balance_rub),
    total_profit_rub:  totalProfit,
    is_profit:         totalProfit >= 0,
    days,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT MANUEL
// ─────────────────────────────────────────────────────────────────────────────

const takeSnapshotService = async (type) => {
  if (!["start_of_day", "end_of_day"].includes(type)) {
    throw new Error("Type invalide : start_of_day ou end_of_day");
  }
  const res = await db.query(
    `SELECT take_balance_snapshot($1) AS result`,
    [type]
  );
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
  const validPeriods = ["day", "week", "month"];
  if (!validPeriods.includes(period)) {
    throw new Error("Période invalide : day, week ou month");
  }

  const targetDate = date || new Date().toISOString().split("T")[0];
  if (isNaN(Date.parse(targetDate))) {
    throw new Error("Date invalide, format attendu : YYYY-MM-DD");
  }

  const res = await db.query(
    `SELECT get_profit($1, $2::DATE) AS result`,
    [period, targetDate]
  );

  return normalizeProfit(res.rows[0].result);
};

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIQUE — N derniers jours depuis balance_snapshots
// Colonne réelle : total_rub (pas total_balance_rub)
// ─────────────────────────────────────────────────────────────────────────────

const getProfitHistoryService = async (limit = 30) => {
  const n = Math.min(Math.max(parseInt(limit) || 30, 1), 90);

  const res = await db.query(
    `
    SELECT
      s.snapshot_date,
      MAX(CASE WHEN s.snapshot_type = 'start_of_day' THEN s.total_rub END) AS start_balance_rub,
      MAX(CASE WHEN s.snapshot_type = 'end_of_day'   THEN s.total_rub END) AS end_balance_rub
    FROM balance_snapshots s
    WHERE s.snapshot_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
    GROUP BY s.snapshot_date
    ORDER BY s.snapshot_date ASC
    `,
    [n]
  );

  const days = res.rows.map((row) => {
    const start    = toFloat(row.start_balance_rub);
    const hasEnd   = row.end_balance_rub !== null;
    const end      = hasEnd ? toFloat(row.end_balance_rub) : null;
    const profit   = hasEnd ? Math.round((end - start) * 100) / 100 : null;
    return {
      date:              row.snapshot_date,
      start_balance_rub: start,
      end_balance_rub:   end,
      profit_rub:        profit,
      is_profit:         profit === null ? null : profit >= 0,
      is_complete:       hasEnd,
    };
  });

  // Résumé statistique
  const complete    = days.filter((d) => d.is_complete);
  const totalProfit = complete.reduce((s, d) => s + (d.profit_rub ?? 0), 0);
  const profitDays  = complete.filter((d) => d.profit_rub >= 0).length;
  const lossDays    = complete.filter((d) => d.profit_rub < 0).length;
  const bestDay     = complete.reduce((b, d) => (!b || d.profit_rub > b.profit_rub ? d : b), null);
  const worstDay    = complete.reduce((w, d) => (!w || d.profit_rub < w.profit_rub ? d : w), null);

  return {
    days,
    summary: {
      total_days:       days.length,
      complete_days:    complete.length,
      total_profit_rub: Math.round(totalProfit * 100) / 100,
      is_profit:        totalProfit >= 0,
      profit_days:      profitDays,
      loss_days:        lossDays,
      win_rate:         complete.length > 0
                          ? Math.round((profitDays / complete.length) * 100)
                          : 0,
      best_day:  bestDay  ? { date: bestDay.date,  profit_rub: bestDay.profit_rub  } : null,
      worst_day: worstDay ? { date: worstDay.date, profit_rub: worstDay.profit_rub } : null,
    },
    computed_at: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BALANCES ACTUELLES + profit non réalisé du jour
// Colonne réelle : total_rub (pas total_balance_rub)
// ─────────────────────────────────────────────────────────────────────────────

const getCurrentBalancesService = async () => {
  // 1. Balances en temps réel, converties en RUB
  const balancesRes = await db.query(`
    SELECT
      a.id            AS agent_id,
      a.name          AS agent_name,
      c.code          AS currency,
      c.symbol        AS currency_symbol,
      b.amount,
      CASE
        WHEN c.code = 'RUB' THEN 1
        ELSE r.rate + 0.20
      END AS rate_internal,
      CASE
        WHEN c.code = 'RUB' THEN b.amount
        WHEN r.rate IS NOT NULL THEN ROUND(b.amount / (r.rate + 0.20), 2)
        ELSE NULL
      END AS amount_rub,
      b.last_updated
    FROM balances b
    JOIN agents     a ON a.id = b.agent_id AND a.deleted_at IS NULL
    JOIN currencies c ON c.id = b.currency_id
    LEFT JOIN rates r
      ON  r.to_currency_id   = b.currency_id
      AND r.from_currency_id = (SELECT id FROM currencies WHERE code = 'RUB')
      AND r.is_active = true
    WHERE b.amount >= 0
    ORDER BY a.name, c.code
  `);

  // 2. Snapshot start_of_day du jour pour le profit non réalisé
  //    Colonne réelle de balance_snapshots : total_rub
  const today       = new Date().toISOString().split("T")[0];
  const snapRes     = await db.query(
    `SELECT total_rub FROM balance_snapshots
     WHERE snapshot_type = 'start_of_day' AND snapshot_date = $1
     LIMIT 1`,
    [today]
  );
  const startOfDayRub = snapRes.rows.length > 0
    ? toFloat(snapRes.rows[0].total_rub)
    : null;

  // 3. Agréger par agent
  const byAgent     = {};
  let grandTotalRub = 0;

  for (const row of balancesRes.rows) {
    if (!byAgent[row.agent_id]) {
      byAgent[row.agent_id] = {
        agent_id:   row.agent_id,
        agent_name: row.agent_name,
        balances:   [],
        total_rub:  0,
      };
    }
    const amountRub = toFloat(row.amount_rub);
    byAgent[row.agent_id].balances.push({
      currency:        row.currency,
      currency_symbol: row.currency_symbol,
      amount:          toFloat(row.amount),
      rate_internal:   row.rate_internal ? toFloat(row.rate_internal) : null,
      amount_rub:      amountRub,
      last_updated:    row.last_updated,
    });
    byAgent[row.agent_id].total_rub += amountRub;
    grandTotalRub += amountRub;
  }

  grandTotalRub = Math.round(grandTotalRub * 100) / 100;

  // 4. Profit non réalisé = balance actuelle − snapshot start_of_day
  const unrealizedProfit = startOfDayRub !== null
    ? Math.round((grandTotalRub - startOfDayRub) * 100) / 100
    : null;

  return {
    agents: Object.values(byAgent).map((a) => ({
      ...a,
      total_rub: Math.round(a.total_rub * 100) / 100,
    })),
    grand_total_rub:        grandTotalRub,
    start_of_day_rub:       startOfDayRub,
    unrealized_profit_rub:  unrealizedProfit,
    unrealized_is_profit:   unrealizedProfit === null ? null : unrealizedProfit >= 0,
    computed_at:            new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  takeSnapshotService,
  getProfitService,
  getProfitHistoryService,
  getCurrentBalancesService,
};