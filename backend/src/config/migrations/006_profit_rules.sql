-- ===================================================================
-- MIGRATION 006 — Règles de calcul du bénéfice
-- ===================================================================
-- À exécuter après 005_staff_push.sql. Idempotente.
--
-- Principe : tout est valorisé en RUB au « taux interne »
--            1 RUB = (taux client RUB→devise + écart) devise
-- (écart = 0,20, déjà utilisé par l'application ; défini une seule fois
--  ci-dessous dans profit_spread()).
--
-- Bénéfice d'une transaction effectuée, figé au moment où elle est effectuée :
--   encaissé        = valeur RUB de send_amount   (ce que le client a payé à l'agent)
--   décaissé        = valeur RUB de total_debit   (montant reçu + frais d'envoi opérateur)
--   marge brute     = encaissé − décaissé         (écart de taux + frais de retrait − frais d'envoi)
--   commission      = valeur RUB du gain de l'agent
--   bénéfice net    = marge brute − commission
--
-- Bénéfice d'une journée (soldes) :
--   variation des soldes − apports nets de l'admin (crédits − débits manuels)
-- ===================================================================

BEGIN;

-- ─── Écart entre taux client et taux interne (un seul endroit à modifier) ───
CREATE OR REPLACE FUNCTION profit_spread()
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$ SELECT 0.20::NUMERIC $$;

-- ─── Taux interne : 1 RUB = X devise (NULL si aucun taux RUB→devise actif) ───
CREATE OR REPLACE FUNCTION internal_rate_from_rub(p_currency_id INT)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
    SELECT CASE
             WHEN c.code = 'RUB' THEN 1::NUMERIC
             ELSE (SELECT r.rate + profit_spread()
                   FROM rates r
                   JOIN currencies rub ON rub.id = r.from_currency_id AND rub.code = 'RUB'
                   WHERE r.to_currency_id = p_currency_id
                     AND r.is_active = true AND r.deleted_at IS NULL
                   LIMIT 1)
           END
    FROM currencies c
    WHERE c.id = p_currency_id
$$;

-- ─── Valeur en RUB d'un montant (NULL si la devise n'a pas de taux interne) ───
CREATE OR REPLACE FUNCTION rub_value(p_amount NUMERIC, p_currency_id INT)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
    SELECT ROUND(p_amount / NULLIF(internal_rate_from_rub(p_currency_id), 0), 2)
$$;

-- ===================================================================
-- Bénéfice par transaction, figé quand elle passe à « effectuee »
-- ===================================================================
CREATE TABLE IF NOT EXISTS transaction_profits (
    transaction_id      INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    send_value_rub      NUMERIC(20, 2),    -- encaissé
    payout_value_rub    NUMERIC(20, 2),    -- décaissé (reçu + frais d'envoi)
    withdrawal_fee_rub  NUMERIC(20, 2),    -- dont frais de retrait (information)
    sending_fee_rub     NUMERIC(20, 2),    -- dont frais d'envoi opérateur (information)
    gross_margin_rub    NUMERIC(20, 2),    -- encaissé − décaissé
    commission_rub      NUMERIC(20, 2),    -- gain de l'agent
    net_profit_rub      NUMERIC(20, 2),    -- marge brute − commission
    from_internal_rate  NUMERIC(20, 6),    -- taux internes utilisés (traçabilité)
    to_internal_rate    NUMERIC(20, 6),
    complete            BOOLEAN NOT NULL DEFAULT true,  -- false : une devise sans taux RUB
    computed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION compute_transaction_profit(p_transaction_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_tx        transactions%ROWTYPE;
    v_from_cur  INT;
    v_to_cur    INT;
    v_from_rate NUMERIC;
    v_to_rate   NUMERIC;
    v_send      NUMERIC;
    v_payout    NUMERIC;
    v_commission NUMERIC;
BEGIN
    SELECT * INTO v_tx FROM transactions WHERE id = p_transaction_id;
    IF NOT FOUND OR v_tx.status <> 'effectuee' THEN RETURN; END IF;

    SELECT currency_id INTO v_from_cur FROM countries WHERE id = v_tx.from_country_id;
    SELECT currency_id INTO v_to_cur   FROM countries WHERE id = v_tx.to_country_id;
    v_from_rate := internal_rate_from_rub(v_from_cur);
    v_to_rate   := internal_rate_from_rub(v_to_cur);

    v_send   := ROUND(v_tx.send_amount / NULLIF(v_from_rate, 0), 2);
    v_payout := ROUND(COALESCE(v_tx.total_debit_amount, v_tx.receive_amount + v_tx.sending_fee_amount)
                      / NULLIF(v_to_rate, 0), 2);
    SELECT COALESCE(ROUND(SUM(g.gain_amount / NULLIF(internal_rate_from_rub(g.currency_id), 0)), 2), 0)
      INTO v_commission
      FROM gains g WHERE g.transaction_id = v_tx.id;

    INSERT INTO transaction_profits (
        transaction_id, send_value_rub, payout_value_rub, withdrawal_fee_rub, sending_fee_rub,
        gross_margin_rub, commission_rub, net_profit_rub, from_internal_rate, to_internal_rate,
        complete, computed_at
    ) VALUES (
        v_tx.id, v_send, v_payout,
        ROUND(v_tx.withdrawal_fee_amount / NULLIF(v_from_rate, 0), 2),
        ROUND(v_tx.sending_fee_amount / NULLIF(v_to_rate, 0), 2),
        v_send - v_payout, v_commission, v_send - v_payout - v_commission,
        v_from_rate, v_to_rate,
        v_from_rate IS NOT NULL AND v_to_rate IS NOT NULL,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (transaction_id) DO UPDATE SET
        send_value_rub = EXCLUDED.send_value_rub, payout_value_rub = EXCLUDED.payout_value_rub,
        withdrawal_fee_rub = EXCLUDED.withdrawal_fee_rub, sending_fee_rub = EXCLUDED.sending_fee_rub,
        gross_margin_rub = EXCLUDED.gross_margin_rub, commission_rub = EXCLUDED.commission_rub,
        net_profit_rub = EXCLUDED.net_profit_rub, from_internal_rate = EXCLUDED.from_internal_rate,
        to_internal_rate = EXCLUDED.to_internal_rate, complete = EXCLUDED.complete,
        computed_at = EXCLUDED.computed_at;
END;
$$;

CREATE OR REPLACE FUNCTION trg_transaction_profit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Le gain de l'agent est inséré par finalize_transaction avant ce changement de statut
    IF NEW.status = 'effectuee' AND OLD.status IS DISTINCT FROM 'effectuee' THEN
        PERFORM compute_transaction_profit(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_profit ON transactions;
CREATE TRIGGER trg_transactions_profit
    AFTER UPDATE OF status ON transactions
    FOR EACH ROW EXECUTE FUNCTION trg_transaction_profit();

-- Transactions déjà effectuées : calcul avec les taux actuels (approximation,
-- les taux du jour de la transaction ne sont pas conservés)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT t.id FROM transactions t
             LEFT JOIN transaction_profits p ON p.transaction_id = t.id
             WHERE t.status = 'effectuee' AND p.transaction_id IS NULL
    LOOP
        PERFORM compute_transaction_profit(r.id);
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_completed_at
    ON transactions (completed_at) WHERE status = 'effectuee';

-- ===================================================================
-- Snapshots de soldes : même valorisation (rub_value)
-- ===================================================================
CREATE OR REPLACE FUNCTION take_balance_snapshot(p_type VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_rub     NUMERIC := 0;
    v_detail        JSONB   := '[]'::JSONB;
    v_row           RECORD;
    v_snapshot_date DATE    := CURRENT_DATE;
BEGIN
    FOR v_row IN
        SELECT b.agent_id, a.name AS agent_name, c.code AS currency_code, b.amount,
               rub_value(b.amount, b.currency_id) AS amount_rub
        FROM balances b
        JOIN agents     a ON a.id = b.agent_id AND a.deleted_at IS NULL
        JOIN currencies c ON c.id = b.currency_id
        WHERE b.amount > 0 AND b.deleted_at IS NULL
    LOOP
        v_total_rub := v_total_rub + COALESCE(v_row.amount_rub, 0);
        v_detail := v_detail || jsonb_build_object(
            'agent_id',   v_row.agent_id,
            'agent_name', v_row.agent_name,
            'currency',   v_row.currency_code,
            'amount',     v_row.amount,
            'amount_rub', COALESCE(v_row.amount_rub, 0)
        ) || CASE WHEN v_row.amount_rub IS NULL
                  THEN jsonb_build_object('warning', 'Taux introuvable, balance ignorée')
                  ELSE '{}'::JSONB END;
    END LOOP;

    INSERT INTO balance_snapshots (snapshot_type, snapshot_date, total_rub, detail)
    VALUES (p_type, v_snapshot_date, v_total_rub, v_detail)
    ON CONFLICT (snapshot_type, snapshot_date)
    DO UPDATE SET total_rub = EXCLUDED.total_rub, detail = EXCLUDED.detail, created_at = NOW();

    RETURN jsonb_build_object(
        'success',       true,
        'snapshot_type', p_type,
        'snapshot_date', v_snapshot_date,
        'total_rub',     v_total_rub,
        'nb_entries',    jsonb_array_length(v_detail),
        'detail',        v_detail
    );
END;
$$;

-- ===================================================================
-- Bénéfice par jour (une seule règle, utilisée par la période et l'historique)
--   profit_rub          : bénéfice net des transactions effectuées ce jour-là
--   balance_profit_rub  : contrôle — variation des soldes − apports nets de l'admin.
--                         Fin de journée manquante (serveur arrêté) → début du lendemain.
-- ===================================================================
CREATE OR REPLACE FUNCTION profit_days(p_from DATE, p_to DATE)
RETURNS TABLE (
    day                 DATE,
    start_rub           NUMERIC,
    end_rub             NUMERIC,
    net_deposits_rub    NUMERIC,
    balance_profit_rub  NUMERIC,
    tx_count            INT,
    gross_margin_rub    NUMERIC,
    commission_rub      NUMERIC,
    profit_rub          NUMERIC,
    incomplete_count    INT
)
LANGUAGE sql STABLE
AS $$
    WITH days AS (
        SELECT gs::DATE AS day FROM generate_series(p_from, p_to, INTERVAL '1 day') gs
    ),
    snaps AS (
        SELECT d.day,
               (SELECT total_rub FROM balance_snapshots
                 WHERE snapshot_type = 'start_of_day' AND snapshot_date = d.day) AS start_rub,
               COALESCE(
                 (SELECT total_rub FROM balance_snapshots
                   WHERE snapshot_type = 'end_of_day' AND snapshot_date = d.day),
                 (SELECT total_rub FROM balance_snapshots
                   WHERE snapshot_type = 'start_of_day' AND snapshot_date = d.day + 1)
               ) AS end_rub
        FROM days d
    ),
    flows AS (
        SELECT d.day,
               COALESCE(SUM(CASE WHEN bt.type = 'credit' THEN 1 ELSE -1 END
                            * rub_value(bt.amount, b.currency_id)), 0) AS net_deposits_rub
        FROM days d
        LEFT JOIN balance_transactions bt ON bt.created_at::DATE = d.day
        LEFT JOIN balances b ON b.id = bt.balance_id
        GROUP BY d.day
    ),
    tx AS (
        SELECT d.day,
               COUNT(t.id)::INT                             AS tx_count,
               COALESCE(SUM(p.gross_margin_rub), 0)         AS gross_margin_rub,
               COALESCE(SUM(p.commission_rub), 0)           AS commission_rub,
               COALESCE(SUM(p.net_profit_rub), 0)           AS profit_rub,
               COUNT(t.id) FILTER (WHERE p.complete IS NOT TRUE)::INT AS incomplete_count
        FROM days d
        LEFT JOIN transactions t ON t.status = 'effectuee' AND t.completed_at::DATE = d.day
        LEFT JOIN transaction_profits p ON p.transaction_id = t.id
        GROUP BY d.day
    )
    SELECT s.day, s.start_rub, s.end_rub, ROUND(f.net_deposits_rub, 2),
           CASE WHEN s.start_rub IS NOT NULL AND s.end_rub IS NOT NULL
                THEN ROUND(s.end_rub - s.start_rub - f.net_deposits_rub, 2) END,
           x.tx_count, ROUND(x.gross_margin_rub, 2), ROUND(x.commission_rub, 2), ROUND(x.profit_rub, 2),
           x.incomplete_count
    FROM snaps s JOIN flows f USING (day) JOIN tx x USING (day)
    ORDER BY s.day
$$;

CREATE OR REPLACE FUNCTION get_profit(
    p_period VARCHAR,
    p_date   DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_from   DATE;
    v_to     DATE;
    v_result JSONB;
BEGIN
    IF p_period = 'day' THEN
        v_from := p_date; v_to := p_date;
    ELSIF p_period = 'week' THEN
        v_from := date_trunc('week', p_date)::DATE; v_to := v_from + 6;
    ELSIF p_period = 'month' THEN
        v_from := date_trunc('month', p_date)::DATE;
        v_to   := (date_trunc('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
        RAISE EXCEPTION 'INVALID_PERIOD: %', p_period;
    END IF;

    SELECT jsonb_build_object(
        'period', p_period,
        'from', v_from,
        'to', v_to,
        'start_balance_rub', COALESCE((SELECT d.start_rub FROM profit_days(v_from, v_to) d WHERE d.start_rub IS NOT NULL ORDER BY d.day LIMIT 1), 0),
        'end_balance_rub',   COALESCE((SELECT d.end_rub FROM profit_days(v_from, v_to) d WHERE d.end_rub IS NOT NULL ORDER BY d.day DESC LIMIT 1), 0),
        -- Bénéfice principal : bénéfice net des transactions effectuées
        'total_profit_rub',   SUM(p.profit_rub),
        'is_profit',          SUM(p.profit_rub) >= 0,
        'transactions_count', SUM(p.tx_count),
        'gross_margin_rub',   SUM(p.gross_margin_rub),
        'commission_rub',     SUM(p.commission_rub),
        'incomplete_count',   SUM(p.incomplete_count),
        -- Contrôle : variation des soldes hors apports de l'admin
        'balance_profit_rub', SUM(p.balance_profit_rub),
        'net_deposits_rub',   SUM(p.net_deposits_rub),
        'days', jsonb_agg(jsonb_build_object(
            'date',               p.day,
            'start_balance_rub',  p.start_rub,
            'end_balance_rub',    p.end_rub,
            'net_deposits_rub',   p.net_deposits_rub,
            'balance_profit_rub', p.balance_profit_rub,
            'transactions_count', p.tx_count,
            'gross_margin_rub',   p.gross_margin_rub,
            'commission_rub',     p.commission_rub,
            'profit_rub',         p.profit_rub
        ) ORDER BY p.day)
    )
    INTO v_result
    FROM profit_days(v_from, v_to) p;

    RETURN v_result;
END;
$$;

COMMIT;
