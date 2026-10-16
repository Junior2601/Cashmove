-- ===================================================================
-- SCHÉMA BASE DE DONNÉES — Plateforme de transfert Russie ↔ Afrique
-- Stack : PostgreSQL — Version consolidée 3.0
-- ===================================================================
-- ORDRE DE CRÉATION (respect des dépendances FK) :
--   1. admins        6. payment_methods   11. gains
--   2. semi_admins   7. balances          12. redirections
--   3. currencies    8. authorized_numbers 13. history
--   4. countries     9. rates             14. Fonctions + Triggers
--   5. agents       10. transactions      15. Vues + Index
-- ===================================================================
-- MISES À JOUR : après ce fichier, exécuter dans l'ordre les fichiers
--   migrations/NNN_*.sql (ex : 001_v2_clients.sql pour la V2).

-- ===================================================================
-- 1. ADMINISTRATEURS
-- ===================================================================
CREATE TABLE admins (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP DEFAULT NULL
);

-- ===================================================================
-- 2. SEMI-ADMINISTRATEURS
-- ===================================================================
CREATE TABLE semi_admins (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP DEFAULT NULL
);

-- ===================================================================
-- 3. DEVISES
-- ===================================================================
CREATE TABLE currencies (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(10)  NOT NULL UNIQUE,   -- ex : XOF, RUB, EUR, XAF
    name          VARCHAR(100) NOT NULL,
    symbol        VARCHAR(10)  NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP DEFAULT NULL
);

-- ===================================================================
-- 4. PAYS
-- ===================================================================
CREATE TABLE countries (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    code          VARCHAR(3)   NOT NULL UNIQUE,   -- ISO 3166-1 alpha-3
    phone_prefix  VARCHAR(10)  NOT NULL,          -- ex: +225, +7, +237
    currency_id   INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP DEFAULT NULL
);

-- ===================================================================
-- 5. AGENTS
-- ===================================================================
CREATE TABLE agents (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        TEXT NOT NULL,
    country_id      INTEGER NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    can_process     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP DEFAULT NULL
);

-- ===================================================================
-- 6. MOYENS DE PAIEMENT (liés à un pays)
-- ===================================================================
-- withdrawal_fee_percent : frais de retrait (côté méthode ÉMETTRICE),
--                          réduit le montant reçu par le client.
-- sending_fee_percent    : frais d'envoi (côté méthode RÉCEPTRICE),
--                          débite le solde de l'agent, invisible au client.
-- ===================================================================
CREATE TABLE payment_methods (
    id                       SERIAL PRIMARY KEY,
    country_id               INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    method                   VARCHAR(100) NOT NULL,
    currency_id              INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    withdrawal_fee_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,
    sending_fee_percent      NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_active                BOOLEAN NOT NULL DEFAULT true,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at               TIMESTAMP DEFAULT NULL,

    UNIQUE (country_id, method),
    CONSTRAINT valid_withdrawal_fee CHECK (withdrawal_fee_percent >= 0 AND withdrawal_fee_percent <= 100),
    CONSTRAINT valid_sending_fee    CHECK (sending_fee_percent    >= 0 AND sending_fee_percent    <= 100)
);

COMMENT ON COLUMN payment_methods.withdrawal_fee_percent IS
  'Frais de retrait en %, supporté par le client (déduit du montant reçu).';
COMMENT ON COLUMN payment_methods.sending_fee_percent IS
  'Frais d''envoi en %, supporté par l''agent (débit supplémentaire du solde).';

-- ===================================================================
-- 7. BALANCES MULTI-DEVISES DES AGENTS
-- ===================================================================
CREATE TABLE balances (
    id            SERIAL PRIMARY KEY,
    agent_id      INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    currency_id   INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
    amount        NUMERIC(20, 2) NOT NULL DEFAULT 0,
    last_updated  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP DEFAULT NULL,

    UNIQUE (agent_id, currency_id),
    CONSTRAINT positive_balance CHECK (amount >= 0)
);

CREATE TABLE balance_transactions (
    id           SERIAL PRIMARY KEY,
    balance_id   INTEGER NOT NULL REFERENCES balances(id) ON DELETE CASCADE,
    amount       NUMERIC(15,2) NOT NULL,
    type         VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    description  TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE balance_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_type   VARCHAR(20) NOT NULL,          -- 'start_of_day' | 'end_of_day'
    snapshot_date   DATE        NOT NULL,
    total_rub       NUMERIC(20, 2) NOT NULL,       -- valeur totale convertie en RUB
    detail          JSONB DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (snapshot_type, snapshot_date)
);

-- ===================================================================
-- 8. NUMÉROS AGRÉÉS DE TRANSFERT
-- ===================================================================
CREATE TABLE authorized_numbers (
    id                  SERIAL PRIMARY KEY,
    agent_id            INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    country_id          INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    payment_method_id   INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    number              VARCHAR(50) NOT NULL,
    label               VARCHAR(100) DEFAULT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP DEFAULT NULL,

    UNIQUE (agent_id, country_id, payment_method_id)
);

-- ===================================================================
-- 9. TAUX DE CHANGE
-- ===================================================================
CREATE TABLE rates (
    id                  SERIAL PRIMARY KEY,
    from_currency_id    INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
    to_currency_id      INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
    rate                NUMERIC(20, 6) NOT NULL,
    commission_percent  NUMERIC(5, 2)  NOT NULL DEFAULT 1.00,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_by          INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP DEFAULT NULL,

    CONSTRAINT positive_rate        CHECK (rate > 0),
    CONSTRAINT valid_commission     CHECK (commission_percent >= 0 AND commission_percent <= 100),
    CONSTRAINT different_currencies CHECK (from_currency_id != to_currency_id),
    UNIQUE (from_currency_id, to_currency_id)
);

-- ===================================================================
-- 10. TRANSACTIONS PRINCIPALES
-- ===================================================================
-- Statuts : en_attente, validee, effectuee, echouee, expiree, annulee
-- ===================================================================
CREATE TABLE transactions (
    id                      SERIAL PRIMARY KEY,
    tracking_code           VARCHAR(30) UNIQUE NOT NULL,

    from_country_id         INTEGER NOT NULL REFERENCES countries(id),
    to_country_id           INTEGER NOT NULL REFERENCES countries(id),

    sender_phone            VARCHAR(30) NOT NULL,
    receiver_phone          VARCHAR(30) NOT NULL,

    sender_method_id        INTEGER NOT NULL REFERENCES payment_methods(id),
    receiver_method_id      INTEGER NOT NULL REFERENCES payment_methods(id),

    -- Côté client : ce qu'il envoie et ce que le bénéficiaire reçoit
    send_amount             NUMERIC(20, 2) NOT NULL,
    withdrawal_fee_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    withdrawal_fee_amount   NUMERIC(20,2) NOT NULL DEFAULT 0,
    net_send_amount         NUMERIC(20,2) NOT NULL DEFAULT 0,
    receive_amount          NUMERIC(20, 2) NOT NULL,

    -- Côté agent : ce que son solde encaisse réellement
    sending_fee_percent     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    sending_fee_amount      NUMERIC(20,2) NOT NULL DEFAULT 0,
    total_debit_amount      NUMERIC(20,2) NOT NULL,

    -- Snapshot taux/commission au moment de la transaction
    rate_applied            NUMERIC(20, 6) NOT NULL,
    commission_applied      NUMERIC(5, 2)  NOT NULL,

    status                  VARCHAR(20) NOT NULL DEFAULT 'en_attente',

    assigned_agent_id       INTEGER REFERENCES agents(id),
    authorized_number_id    INTEGER REFERENCES authorized_numbers(id),

    client_validated        BOOLEAN NOT NULL DEFAULT false,

    processed_by_type       VARCHAR(20) DEFAULT NULL,   -- 'admin' | 'semi-admin' | 'agent'
    processed_by_id         INTEGER DEFAULT NULL,

    expires_at              TIMESTAMP DEFAULT NULL,
    completed_at            TIMESTAMP DEFAULT NULL,
    cancelled_at            TIMESTAMP DEFAULT NULL,

    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT positive_amounts    CHECK (send_amount > 0 AND receive_amount > 0),
    CONSTRAINT different_countries CHECK (from_country_id != to_country_id),
    CONSTRAINT valid_status        CHECK (status IN (
        'en_attente', 'validee', 'effectuee', 'echouee', 'expiree', 'annulee'
    )),
    CONSTRAINT valid_processor_type CHECK (
        processed_by_type IS NULL OR processed_by_type IN ('admin', 'semi-admin', 'agent')
    )
);

-- ===================================================================
-- 11. GAINS DES AGENTS
-- ===================================================================
CREATE TABLE gains (
    id                          SERIAL PRIMARY KEY,
    transaction_id              INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    agent_id                    INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    currency_id                 INTEGER NOT NULL REFERENCES currencies(id),
    gain_amount                 NUMERIC(20, 2) NOT NULL,
    commission_percent_applied  NUMERIC(5, 2)  NOT NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT positive_gain CHECK (gain_amount >= 0)
);

-- ===================================================================
-- 12. REDIRECTIONS
-- ===================================================================
CREATE TABLE redirections (
    id                  SERIAL PRIMARY KEY,
    transaction_id      INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    from_agent_id       INTEGER NOT NULL REFERENCES agents(id),
    to_agent_id         INTEGER NOT NULL REFERENCES agents(id),
    redirected_amount   NUMERIC(20, 2) NOT NULL,
    reason              TEXT DEFAULT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at        TIMESTAMP DEFAULT NULL,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT positive_redirected_amount CHECK (redirected_amount > 0),
    CONSTRAINT different_agents           CHECK (from_agent_id != to_agent_id),
    CONSTRAINT valid_redirection_status   CHECK (status IN ('pending', 'accepted', 'rejected'))
);

-- ===================================================================
-- 13. HISTORIQUE DES ACTIONS (audit log global)
-- ===================================================================
CREATE TABLE history (
    id            SERIAL PRIMARY KEY,
    action_type   VARCHAR(100) NOT NULL,
    actor_type    VARCHAR(20)  NOT NULL,
    actor_id      INTEGER DEFAULT NULL,
    entity_type   VARCHAR(50)  DEFAULT NULL,
    entity_id     INTEGER      DEFAULT NULL,
    description   TEXT         DEFAULT NULL,
    metadata      JSONB        DEFAULT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_actor_type CHECK (
        actor_type IN ('admin', 'semi-admin', 'agent', 'client', 'system')
    )
);

-- ===================================================================
-- FONCTIONS UTILITAIRES
-- ===================================================================

-- Génère un code de suivi unique
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS VARCHAR(30) AS $$
DECLARE
    new_code    VARCHAR(30);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'TRX'
            || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000000)::TEXT, 8, '0')
            || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 5));
        SELECT EXISTS(SELECT 1 FROM transactions WHERE tracking_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Calcul du gain agent
CREATE OR REPLACE FUNCTION calculate_agent_gain(
    p_receive_amount     NUMERIC,
    p_commission_percent NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN ROUND(p_receive_amount * p_commission_percent / 100, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger générique updated_at (définie UNE SEULE FOIS)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------
-- Frais de retrait : source unique de vérité (taux pur, pas de commission)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_transfer_amounts(
    p_send_amount      NUMERIC,
    p_sender_method_id INT,
    p_rate             NUMERIC
)
RETURNS TABLE (
    fee_percent    NUMERIC,
    fee_amount     NUMERIC,
    net_amount     NUMERIC,
    receive_amount NUMERIC
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_fee_percent NUMERIC;
    v_fee_amount  NUMERIC;
    v_net         NUMERIC;
BEGIN
    SELECT COALESCE(pm.withdrawal_fee_percent, 0)
    INTO v_fee_percent
    FROM payment_methods pm
    WHERE pm.id = p_sender_method_id;

    v_fee_percent := COALESCE(v_fee_percent, 0);
    v_fee_amount  := ROUND(p_send_amount * v_fee_percent / 100, 2);
    v_net         := p_send_amount - v_fee_amount;

    fee_percent    := v_fee_percent;
    fee_amount     := v_fee_amount;
    net_amount     := v_net;
    receive_amount := ROUND(v_net * p_rate, 2);

    RETURN NEXT;
END;
$$;

-- -------------------------------------------------------------------
-- Frais d'envoi : source unique de vérité
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_sending_fee(
    p_receive_amount     NUMERIC,
    p_receiver_method_id INT
)
RETURNS TABLE (
    fee_percent NUMERIC,
    fee_amount  NUMERIC,
    total_debit NUMERIC
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_fee_percent NUMERIC;
    v_fee_amount  NUMERIC;
BEGIN
    SELECT COALESCE(pm.sending_fee_percent, 0)
    INTO v_fee_percent
    FROM payment_methods pm
    WHERE pm.id = p_receiver_method_id;

    v_fee_percent := COALESCE(v_fee_percent, 0);
    v_fee_amount  := ROUND(p_receive_amount * v_fee_percent / 100, 2);

    fee_percent := v_fee_percent;
    fee_amount  := v_fee_amount;
    total_debit := p_receive_amount + v_fee_amount;

    RETURN NEXT;
END;
$$;

-- ===================================================================
-- TRIGGERS updated_at (un seul par table)
-- ===================================================================
CREATE TRIGGER trg_admins_updated_at              BEFORE UPDATE ON admins              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_semi_admins_updated_at         BEFORE UPDATE ON semi_admins         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_currencies_updated_at          BEFORE UPDATE ON currencies          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_countries_updated_at           BEFORE UPDATE ON countries           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_agents_updated_at              BEFORE UPDATE ON agents              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payment_methods_updated_at     BEFORE UPDATE ON payment_methods     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_authorized_numbers_updated_at  BEFORE UPDATE ON authorized_numbers  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rates_updated_at               BEFORE UPDATE ON rates               FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_transactions_updated_at        BEFORE UPDATE ON transactions        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_redirections_updated_at        BEFORE UPDATE ON redirections        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- FONCTIONS MÉTIER
-- ===================================================================

-- -------------------------------------------------------------------
-- Validation client
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_transaction_by_client(
    p_transaction_id INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tx transactions%ROWTYPE;
BEGIN
    SELECT * INTO v_tx
    FROM transactions
    WHERE id = p_transaction_id
      AND status = 'en_attente'
      AND expires_at > NOW()
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM transactions WHERE id = p_transaction_id) THEN
            RAISE EXCEPTION 'TRANSACTION_EXPIRED: Transaction expirée ou déjà validée';
        ELSE
            RAISE EXCEPTION 'TRANSACTION_NOT_FOUND: Transaction introuvable';
        END IF;
    END IF;

    UPDATE transactions
    SET client_validated = true,
        status           = 'validee',
        updated_at       = NOW()
    WHERE id = v_tx.id
    RETURNING * INTO v_tx;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'transaction_client_validated', 'client', NULL,
        'transaction', v_tx.id,
        'Transaction validée par le client',
        jsonb_build_object('transaction_id', v_tx.id)
    );

    RETURN jsonb_build_object(
        'id',               v_tx.id,
        'tracking_code',    v_tx.tracking_code,
        'status',           v_tx.status,
        'client_validated', v_tx.client_validated,
        'send_amount',      v_tx.send_amount,
        'receive_amount',   v_tx.receive_amount,
        'updated_at',       v_tx.updated_at
    );

EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'LOCK_CONFLICT: Transaction en cours de traitement, réessayez dans quelques secondes';
END;
$$;

-- -------------------------------------------------------------------
-- Snapshot des balances (corrigée : END LOOP + INSERT + RETURN)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION take_balance_snapshot(
    p_type VARCHAR  -- 'start_of_day' | 'end_of_day'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rub_currency_id INT;
    v_total_rub       NUMERIC := 0;
    v_detail          JSONB   := '[]'::JSONB;
    v_row             RECORD;
    v_rate_to_rub     NUMERIC;
    v_amount_in_rub   NUMERIC;
    v_snapshot_date   DATE := CURRENT_DATE;
BEGIN
    SELECT id INTO v_rub_currency_id FROM currencies WHERE code = 'RUB';
    IF v_rub_currency_id IS NULL THEN
        RAISE EXCEPTION 'CURRENCY_RUB_NOT_FOUND';
    END IF;

    FOR v_row IN
        SELECT b.id AS balance_id, b.agent_id, a.name AS agent_name,
               b.currency_id, c.code AS currency_code, b.amount
        FROM balances b
        JOIN agents     a ON a.id = b.agent_id AND a.deleted_at IS NULL
        JOIN currencies c ON c.id = b.currency_id
        WHERE b.amount > 0
    LOOP
        IF v_row.currency_id = v_rub_currency_id THEN
            v_amount_in_rub := v_row.amount;
        ELSE
            SELECT rate INTO v_rate_to_rub
            FROM rates
            WHERE from_currency_id = v_rub_currency_id
              AND to_currency_id   = v_row.currency_id
              AND is_active = true
            LIMIT 1;

            IF v_rate_to_rub IS NULL THEN
                v_amount_in_rub := 0;
                v_detail := v_detail || jsonb_build_object(
                    'agent_id',   v_row.agent_id,
                    'agent_name', v_row.agent_name,
                    'currency',   v_row.currency_code,
                    'amount',     v_row.amount,
                    'amount_rub', 0,
                    'warning',    'Taux introuvable, balance ignorée'
                );
                CONTINUE;
            END IF;

            v_amount_in_rub := ROUND(v_row.amount / (v_rate_to_rub + 0.20), 2);
        END IF;

        v_total_rub := v_total_rub + v_amount_in_rub;

        v_detail := v_detail || jsonb_build_object(
            'agent_id',   v_row.agent_id,
            'agent_name', v_row.agent_name,
            'currency',   v_row.currency_code,
            'amount',     v_row.amount,
            'amount_rub', v_amount_in_rub
        );
    END LOOP;

    INSERT INTO balance_snapshots (snapshot_type, snapshot_date, total_rub, detail)
    VALUES (p_type, v_snapshot_date, v_total_rub, v_detail)
    ON CONFLICT (snapshot_type, snapshot_date)
    DO UPDATE SET total_rub  = EXCLUDED.total_rub,
                  detail     = EXCLUDED.detail,
                  created_at = NOW();

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

-- -------------------------------------------------------------------
-- Profit sur une période (basé sur balance_snapshots)
--   p_period : 'day' | 'week' | 'month'
--   p_date   : date de référence (la période qui la contient)
-- Profit d'un jour = end_of_day - start_of_day (NULL si un snapshot manque).
-- Profit total     = somme des profits journaliers connus.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_profit(
    p_period VARCHAR,
    p_date   DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_from        DATE;
    v_to          DATE;
    v_start_total NUMERIC;
    v_end_total   NUMERIC;
    v_total       NUMERIC;
    v_days        JSONB;
BEGIN
    IF p_period = 'day' THEN
        v_from := p_date;
        v_to   := p_date;
    ELSIF p_period = 'week' THEN
        v_from := date_trunc('week', p_date)::DATE;
        v_to   := v_from + 6;
    ELSIF p_period = 'month' THEN
        v_from := date_trunc('month', p_date)::DATE;
        v_to   := (date_trunc('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
    ELSE
        RAISE EXCEPTION 'INVALID_PERIOD: %', p_period;
    END IF;

    WITH d AS (
        SELECT gs::DATE AS day,
               MAX(s.total_rub) FILTER (WHERE s.snapshot_type = 'start_of_day') AS start_rub,
               MAX(s.total_rub) FILTER (WHERE s.snapshot_type = 'end_of_day')   AS end_rub
        FROM generate_series(v_from, v_to, INTERVAL '1 day') gs
        LEFT JOIN balance_snapshots s ON s.snapshot_date = gs::DATE
        GROUP BY gs
    )
    SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
            'date',              day,
            'start_balance_rub', start_rub,
            'end_balance_rub',   end_rub,
            'profit_rub',        end_rub - start_rub
        ) ORDER BY day), '[]'::JSONB),
        COALESCE(SUM(end_rub - start_rub), 0),
        (ARRAY_AGG(start_rub ORDER BY day) FILTER (WHERE start_rub IS NOT NULL))[1],
        (ARRAY_AGG(end_rub ORDER BY day DESC) FILTER (WHERE end_rub IS NOT NULL))[1]
    INTO v_days, v_total, v_start_total, v_end_total
    FROM d;

    RETURN jsonb_build_object(
        'period',            p_period,
        'from',              v_from,
        'to',                v_to,
        'start_balance_rub', COALESCE(v_start_total, 0),
        'end_balance_rub',   COALESCE(v_end_total, 0),
        'total_profit_rub',  v_total,
        'is_profit',         v_total >= 0,
        'days',              v_days
    );
END;
$$;

-- -------------------------------------------------------------------
-- Redirections : create / accept / reject
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_redirection(
    p_transaction_id INT,
    p_to_agent_id    INT,
    p_reason         TEXT,
    p_actor_id       INT,
    p_actor_type     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tx     transactions%ROWTYPE;
    v_target agents%ROWTYPE;
    v_redir  redirections%ROWTYPE;
    v_admins JSONB;
BEGIN
    SELECT * INTO v_tx FROM transactions WHERE id = p_transaction_id FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'TRANSACTION_NOT_FOUND: Transaction introuvable'; END IF;

    IF v_tx.status <> 'validee' THEN
        RAISE EXCEPTION 'TRANSACTION_NOT_REDIRECTABLE: Transaction non redirigeable (statut: %)', v_tx.status;
    END IF;

    IF p_actor_type = 'agent' AND p_actor_id <> v_tx.assigned_agent_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Non autorisé à rediriger cette transaction';
    END IF;

    IF v_tx.assigned_agent_id = p_to_agent_id THEN
        RAISE EXCEPTION 'SAME_AGENT: Impossible de rediriger vers le même agent';
    END IF;

    SELECT * INTO v_target FROM agents
    WHERE id = p_to_agent_id AND is_active = true AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AGENT_NOT_FOUND: Agent destinataire invalide ou inactif';
    END IF;

    INSERT INTO redirections (transaction_id, from_agent_id, to_agent_id, redirected_amount, reason)
    VALUES (v_tx.id, v_tx.assigned_agent_id, p_to_agent_id, v_tx.receive_amount, p_reason)
    RETURNING * INTO v_redir;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'redirection_created', p_actor_type, p_actor_id, 'redirection', v_redir.id,
        format('Redirection de transaction %s de l''agent %s vers %s',
               v_tx.tracking_code, v_tx.assigned_agent_id, p_to_agent_id),
        jsonb_build_object(
            'transaction_id', v_tx.id,
            'from_agent',     v_tx.assigned_agent_id,
            'to_agent',       p_to_agent_id,
            'reason',         p_reason
        )
    );

    SELECT jsonb_agg(jsonb_build_object('email', a.email, 'role', a.role))
    INTO v_admins
    FROM (
        SELECT email, 'admin'      AS role FROM admins      WHERE is_active = true
        UNION ALL
        SELECT email, 'semi_admin' AS role FROM semi_admins WHERE is_active = true
    ) a;

    RETURN jsonb_build_object(
        'redirection',    row_to_json(v_redir)::JSONB,
        'tracking_code',  v_tx.tracking_code,
        'send_amount',    v_tx.send_amount,
        'receive_amount', v_tx.receive_amount,
        'from_agent_id',  v_tx.assigned_agent_id,
        'target_agent',   jsonb_build_object('id', v_target.id, 'email', v_target.email),
        'admins',         COALESCE(v_admins, '[]'::JSONB)
    );

EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'LOCK_CONFLICT: Transaction déjà en cours de traitement, réessayez dans quelques secondes';
END;
$$;

CREATE OR REPLACE FUNCTION accept_redirection(
    p_redirection_id INT,
    p_actor_id       INT,
    p_actor_type     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_redir redirections%ROWTYPE;
BEGIN
    SELECT * INTO v_redir FROM redirections WHERE id = p_redirection_id FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'REDIRECTION_NOT_FOUND: Redirection introuvable'; END IF;

    IF v_redir.status <> 'pending' THEN
        RAISE EXCEPTION 'REDIRECTION_ALREADY_PROCESSED: Cette redirection a déjà été traitée';
    END IF;

    IF p_actor_type = 'agent' AND p_actor_id <> v_redir.to_agent_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Non autorisé à accepter cette redirection';
    END IF;

    UPDATE redirections
    SET status = 'accepted', processed_at = NOW(), updated_at = NOW()
    WHERE id = p_redirection_id;

    UPDATE transactions
    SET assigned_agent_id = v_redir.to_agent_id, updated_at = NOW()
    WHERE id = v_redir.transaction_id;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'redirection_accepted', p_actor_type, p_actor_id, 'redirection', p_redirection_id,
        format('Redirection acceptée par l''agent %s', v_redir.to_agent_id),
        jsonb_build_object('redirection_id', p_redirection_id, 'transaction_id', v_redir.transaction_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Redirection acceptée avec succès',
        'transaction_id', v_redir.transaction_id
    );

EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'LOCK_CONFLICT: Redirection déjà en cours de traitement, réessayez';
END;
$$;

CREATE OR REPLACE FUNCTION reject_redirection(
    p_redirection_id INT,
    p_actor_id       INT,
    p_actor_type     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_redir redirections%ROWTYPE;
BEGIN
    SELECT * INTO v_redir FROM redirections WHERE id = p_redirection_id FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'REDIRECTION_NOT_FOUND: Redirection introuvable'; END IF;

    IF v_redir.status <> 'pending' THEN
        RAISE EXCEPTION 'REDIRECTION_ALREADY_PROCESSED: Cette redirection a déjà été traitée';
    END IF;

    IF p_actor_type = 'agent' AND p_actor_id <> v_redir.to_agent_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Non autorisé à refuser cette redirection';
    END IF;

    UPDATE redirections
    SET status = 'rejected', processed_at = NOW(), updated_at = NOW()
    WHERE id = p_redirection_id;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'redirection_rejected', p_actor_type, p_actor_id, 'redirection', p_redirection_id,
        format('Redirection refusée par l''agent %s', v_redir.to_agent_id),
        jsonb_build_object('redirection_id', p_redirection_id, 'transaction_id', v_redir.transaction_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Redirection refusée',
        'transaction_id', v_redir.transaction_id
    );

EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'LOCK_CONFLICT: Redirection déjà en cours de traitement, réessayez';
END;
$$;

-- -------------------------------------------------------------------
-- create_transaction (version finale : frais retrait + frais envoi)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_transaction(
    p_from_country_id    INT,
    p_to_country_id      INT,
    p_sender_phone       VARCHAR,
    p_receiver_phone     VARCHAR,
    p_sender_method_id   INT,
    p_receiver_method_id INT,
    p_send_amount        NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rate           rates%ROWTYPE;
    v_from_curr_id   INT;
    v_to_curr_id     INT;
    v_calc           RECORD;
    v_send_fee       RECORD;
    v_receive_amount NUMERIC;
    v_agent          agents%ROWTYPE;
    v_auth_num       authorized_numbers%ROWTYPE;
    v_tx             transactions%ROWTYPE;
    v_tracking_code  VARCHAR(30);
BEGIN
    SELECT currency_id INTO v_from_curr_id FROM countries WHERE id = p_from_country_id;
    SELECT currency_id INTO v_to_curr_id   FROM countries WHERE id = p_to_country_id;

    IF v_from_curr_id IS NULL OR v_to_curr_id IS NULL THEN
        RAISE EXCEPTION 'CURRENCIES_NOT_FOUND';
    END IF;

    SELECT * INTO v_rate FROM rates
    WHERE from_currency_id = v_from_curr_id
      AND to_currency_id   = v_to_curr_id
      AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'RATE_NOT_FOUND'; END IF;

    SELECT * INTO v_calc
    FROM compute_transfer_amounts(p_send_amount, p_sender_method_id, v_rate.rate);

    v_receive_amount := v_calc.receive_amount;

    IF v_receive_amount <= 0 THEN RAISE EXCEPTION 'AMOUNT_TOO_LOW'; END IF;

    SELECT * INTO v_send_fee
    FROM compute_sending_fee(v_receive_amount, p_receiver_method_id);

    SELECT a.* INTO v_agent
    FROM agents a
    JOIN authorized_numbers an ON an.agent_id = a.id
    WHERE a.country_id          = p_from_country_id
      AND an.country_id         = p_from_country_id
      AND an.payment_method_id  = p_sender_method_id
      AND an.is_active          = true
      AND an.deleted_at         IS NULL
      AND a.is_active           = true
      AND a.deleted_at          IS NULL
    ORDER BY RANDOM()
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'NO_AGENT_AVAILABLE'; END IF;

    SELECT * INTO v_auth_num FROM authorized_numbers
    WHERE agent_id          = v_agent.id
      AND country_id        = p_from_country_id
      AND payment_method_id = p_sender_method_id
      AND is_active = true
    LIMIT 1;

    v_tracking_code := generate_tracking_code();

    INSERT INTO transactions (
        tracking_code, from_country_id, to_country_id,
        sender_phone, receiver_phone,
        sender_method_id, receiver_method_id,
        send_amount,
        withdrawal_fee_percent, withdrawal_fee_amount, net_send_amount,
        receive_amount,
        sending_fee_percent, sending_fee_amount, total_debit_amount,
        rate_applied, commission_applied,
        status, assigned_agent_id, authorized_number_id,
        client_validated, expires_at, created_at, updated_at
    )
    VALUES (
        v_tracking_code, p_from_country_id, p_to_country_id,
        p_sender_phone, p_receiver_phone,
        p_sender_method_id, p_receiver_method_id,
        p_send_amount,
        v_calc.fee_percent, v_calc.fee_amount, v_calc.net_amount,
        v_receive_amount,
        v_send_fee.fee_percent, v_send_fee.fee_amount, v_send_fee.total_debit,
        v_rate.rate, v_rate.commission_percent,
        'en_attente', v_agent.id, v_auth_num.id,
        false, NOW() + INTERVAL '5 minutes', NOW(), NOW()
    )
    RETURNING * INTO v_tx;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'transaction_created', 'client', NULL, 'transaction', v_tx.id,
        'Transaction creee avec code ' || v_tracking_code,
        jsonb_build_object(
            'transaction_id',  v_tx.id,
            'amount',          p_send_amount,
            'withdrawal_fee',  v_calc.fee_amount,
            'net_send_amount', v_calc.net_amount,
            'receive_amount',  v_receive_amount,
            'sending_fee',     v_send_fee.fee_amount,
            'total_debit',     v_send_fee.total_debit
        )
    );

    RETURN jsonb_build_object(
        'transaction', jsonb_build_object(
            'id',                     v_tx.id,
            'tracking_code',          v_tx.tracking_code,
            'status',                 v_tx.status,
            'send_amount',            v_tx.send_amount,
            'withdrawal_fee_percent', v_tx.withdrawal_fee_percent,
            'withdrawal_fee_amount',  v_tx.withdrawal_fee_amount,
            'net_send_amount',        v_tx.net_send_amount,
            'receive_amount',         v_tx.receive_amount,
            'sending_fee_percent',    v_tx.sending_fee_percent,
            'sending_fee_amount',     v_tx.sending_fee_amount,
            'total_debit_amount',     v_tx.total_debit_amount,
            'rate_applied',           v_tx.rate_applied,
            'commission_applied',     v_tx.commission_applied,
            'expires_at',             v_tx.expires_at,
            'created_at',             v_tx.created_at
        ),
        'agent', jsonb_build_object('id', v_agent.id, 'name', v_agent.name, 'email', v_agent.email),
        'authorized_number', v_auth_num.number
    );
END;
$$;

-- -------------------------------------------------------------------
-- create_agent_transaction (version finale : frais retrait + frais envoi)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_agent_transaction(
    p_agent_id           INT,
    p_from_country_id    INT,
    p_to_country_id      INT,
    p_sender_phone       VARCHAR,
    p_receiver_phone     VARCHAR,
    p_sender_method_id   INT,
    p_receiver_method_id INT,
    p_send_amount        NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent          agents%ROWTYPE;
    v_rate           rates%ROWTYPE;
    v_from_curr_id   INT;
    v_to_curr_id     INT;
    v_calc           RECORD;
    v_send_fee       RECORD;
    v_receive_amount NUMERIC;
    v_auth_num       authorized_numbers%ROWTYPE;
    v_tx             transactions%ROWTYPE;
    v_tracking_code  VARCHAR(30);
BEGIN
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id FOR UPDATE NOWAIT;
    IF NOT FOUND OR NOT v_agent.is_active THEN RAISE EXCEPTION 'AGENT_INACTIVE'; END IF;

    SELECT cf.currency_id INTO v_from_curr_id FROM countries cf WHERE cf.id = p_from_country_id;
    SELECT ct.currency_id INTO v_to_curr_id   FROM countries ct WHERE ct.id = p_to_country_id;

    IF v_from_curr_id IS NULL OR v_to_curr_id IS NULL THEN
        RAISE EXCEPTION 'CURRENCIES_NOT_FOUND';
    END IF;

    SELECT * INTO v_rate FROM rates
    WHERE from_currency_id = v_from_curr_id
      AND to_currency_id   = v_to_curr_id
      AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'RATE_NOT_FOUND'; END IF;

    SELECT * INTO v_calc
    FROM compute_transfer_amounts(p_send_amount, p_sender_method_id, v_rate.rate);

    v_receive_amount := v_calc.receive_amount;
    IF v_receive_amount <= 0 THEN RAISE EXCEPTION 'AMOUNT_TOO_LOW'; END IF;

    SELECT * INTO v_send_fee
    FROM compute_sending_fee(v_receive_amount, p_receiver_method_id);

    SELECT * INTO v_auth_num FROM authorized_numbers
    WHERE agent_id          = p_agent_id
      AND country_id        = p_from_country_id
      AND payment_method_id = p_sender_method_id
      AND is_active = true
    LIMIT 1;

    v_tracking_code := generate_tracking_code();

    INSERT INTO transactions (
        tracking_code, from_country_id, to_country_id,
        sender_phone, receiver_phone,
        sender_method_id, receiver_method_id,
        send_amount,
        withdrawal_fee_percent, withdrawal_fee_amount, net_send_amount,
        receive_amount,
        sending_fee_percent, sending_fee_amount, total_debit_amount,
        rate_applied, commission_applied,
        status, assigned_agent_id, authorized_number_id,
        client_validated, expires_at, created_at, updated_at
    )
    VALUES (
        v_tracking_code, p_from_country_id, p_to_country_id,
        p_sender_phone, p_receiver_phone,
        p_sender_method_id, p_receiver_method_id,
        p_send_amount,
        v_calc.fee_percent, v_calc.fee_amount, v_calc.net_amount,
        v_receive_amount,
        v_send_fee.fee_percent, v_send_fee.fee_amount, v_send_fee.total_debit,
        v_rate.rate, v_rate.commission_percent,
        'validee', p_agent_id, v_auth_num.id,
        true, NULL, NOW(), NOW()
    )
    RETURNING * INTO v_tx;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'agent_transaction_created', 'agent', p_agent_id, 'transaction', v_tx.id,
        'Transaction creee directement par l''agent',
        jsonb_build_object(
            'transaction_id',  v_tx.id,
            'tracking_code',   v_tracking_code,
            'send_amount',     p_send_amount,
            'withdrawal_fee',  v_calc.fee_amount,
            'net_send_amount', v_calc.net_amount,
            'receive_amount',  v_receive_amount,
            'sending_fee',     v_send_fee.fee_amount,
            'total_debit',     v_send_fee.total_debit
        )
    );

    RETURN jsonb_build_object(
        'transaction', jsonb_build_object(
            'id',                     v_tx.id,
            'tracking_code',          v_tx.tracking_code,
            'status',                 v_tx.status,
            'send_amount',            v_tx.send_amount,
            'withdrawal_fee_percent', v_tx.withdrawal_fee_percent,
            'withdrawal_fee_amount',  v_tx.withdrawal_fee_amount,
            'net_send_amount',        v_tx.net_send_amount,
            'receive_amount',         v_tx.receive_amount,
            'sending_fee_percent',    v_tx.sending_fee_percent,
            'sending_fee_amount',     v_tx.sending_fee_amount,
            'total_debit_amount',     v_tx.total_debit_amount,
            'rate_applied',           v_tx.rate_applied,
            'commission_applied',     v_tx.commission_applied,
            'client_validated',       v_tx.client_validated,
            'created_at',             v_tx.created_at
        ),
        'authorized_number', v_auth_num.number
    );

EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'LOCK_CONFLICT: Ressource en cours de traitement, reessayez';
END;
$$;

-- -------------------------------------------------------------------
-- finalize_transaction (version unique : redirections + frais envoi)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION finalize_transaction(
    p_transaction_id INT,
    p_actor_type     TEXT,   -- 'admin' | 'semi-admin' | 'agent'
    p_actor_id       INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tx              transactions%ROWTYPE;
    v_agent           agents%ROWTYPE;
    v_redir           redirections%ROWTYPE;
    v_is_redirected   BOOLEAN := false;
    v_origin_agent_id INT;
    v_payout_agent_id INT;
    v_from_currency   INT;
    v_to_currency     INT;
    v_from_code       TEXT;
    v_to_code         TEXT;
    v_from_symbol     TEXT;
    v_to_symbol       TEXT;
    v_send_bal        balances%ROWTYPE;
    v_recv_bal        balances%ROWTYPE;
    v_old_send        NUMERIC;
    v_new_send        NUMERIC;
    v_old_recv        NUMERIC;
    v_new_recv        NUMERIC;
    v_sending_fee     NUMERIC;
    v_total_debit     NUMERIC;
    v_gain            NUMERIC;
    v_description     TEXT;
BEGIN
    -- 1. Lock transaction
    SELECT * INTO v_tx FROM transactions WHERE id = p_transaction_id FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'TRANSACTION_NOT_FOUND'; END IF;

    IF v_tx.status <> 'validee' THEN
        RAISE EXCEPTION 'TRANSACTION_NOT_VALIDATED: status=%', v_tx.status;
    END IF;

    -- 2. Droits agent
    IF p_actor_type = 'agent' AND v_tx.assigned_agent_id <> p_actor_id THEN
        RAISE EXCEPTION 'AGENT_NOT_AUTHORIZED';
    END IF;

    -- 3. Redirection acceptée ?
    SELECT * INTO v_redir FROM redirections
    WHERE transaction_id = p_transaction_id AND status = 'accepted'
    ORDER BY processed_at DESC NULLS LAST, id DESC
    LIMIT 1;

    IF FOUND AND v_redir.from_agent_id IS DISTINCT FROM v_tx.assigned_agent_id THEN
        v_is_redirected   := true;
        v_origin_agent_id := v_redir.from_agent_id;
        v_payout_agent_id := v_tx.assigned_agent_id;
    ELSE
        v_origin_agent_id := v_tx.assigned_agent_id;
        v_payout_agent_id := v_tx.assigned_agent_id;
    END IF;

    -- 4. Lock agents en ordre d'id croissant (anti-deadlock)
    PERFORM 1 FROM agents
    WHERE id IN (v_origin_agent_id, v_payout_agent_id)
    ORDER BY id
    FOR UPDATE NOWAIT;

    SELECT * INTO v_agent FROM agents WHERE id = v_payout_agent_id;
    IF NOT FOUND OR NOT v_agent.is_active THEN RAISE EXCEPTION 'AGENT_INACTIVE'; END IF;

    IF p_actor_type = 'agent' AND NOT v_agent.can_process THEN
        RAISE EXCEPTION 'AGENT_CANNOT_PROCESS';
    END IF;

    -- 5. Devises
    SELECT curr_from.id, curr_from.code, curr_from.symbol,
           curr_to.id,   curr_to.code,   curr_to.symbol
    INTO   v_from_currency, v_from_code, v_from_symbol,
           v_to_currency,   v_to_code,   v_to_symbol
    FROM countries c_from
    JOIN countries c_to       ON c_to.id = v_tx.to_country_id
    JOIN currencies curr_from ON curr_from.id = c_from.currency_id
    JOIN currencies curr_to   ON curr_to.id   = c_to.currency_id
    WHERE c_from.id = v_tx.from_country_id;

    IF v_from_currency IS NULL THEN RAISE EXCEPTION 'CURRENCIES_NOT_FOUND'; END IF;

    -- 6. Lock balances en ordre d'id croissant (anti-deadlock)
    PERFORM 1 FROM balances
    WHERE ((agent_id = v_origin_agent_id AND currency_id = v_from_currency)
        OR (agent_id = v_payout_agent_id AND currency_id = v_to_currency))
      AND deleted_at IS NULL
    ORDER BY id
    FOR UPDATE NOWAIT;

    SELECT * INTO v_send_bal FROM balances
    WHERE agent_id = v_origin_agent_id
      AND currency_id = v_from_currency
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'BALANCE_NOT_FOUND_SEND: agent=%, currency=%',
            v_origin_agent_id, v_from_code;
    END IF;

    SELECT * INTO v_recv_bal FROM balances
    WHERE agent_id = v_payout_agent_id
      AND currency_id = v_to_currency
      AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'BALANCE_NOT_FOUND_RECV: agent=%, currency=%',
            v_payout_agent_id, v_to_code;
    END IF;

    -- 7. Frais d'envoi
    v_sending_fee := COALESCE(v_tx.sending_fee_amount, 0);
    v_total_debit := COALESCE(v_tx.total_debit_amount,
                              v_tx.receive_amount + v_sending_fee);

    -- 8. Fonds suffisants
    v_old_recv := v_recv_bal.amount;
    IF v_old_recv < v_total_debit THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS: available=%, required=% (dont % de frais d''envoi)',
            v_old_recv, v_total_debit, v_sending_fee;
    END IF;

    -- 9. Nouveaux montants
    v_old_send := v_send_bal.amount;
    v_new_send := v_old_send + v_tx.send_amount;
    v_new_recv := v_old_recv - v_total_debit;
    v_gain     := ROUND((v_tx.receive_amount * v_tx.commission_applied) / 100, 2);

    -- 10. Mise à jour des balances
    UPDATE balances SET amount = v_new_send, last_updated = NOW() WHERE id = v_send_bal.id;
    UPDATE balances SET amount = v_new_recv, last_updated = NOW() WHERE id = v_recv_bal.id;

    -- 11. Gain → agent d'origine
    INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount,
                       commission_percent_applied, created_at)
    VALUES (v_tx.id, v_origin_agent_id, v_to_currency, v_gain,
            v_tx.commission_applied, NOW());

    -- 12. Finaliser
    UPDATE transactions
    SET status            = 'effectuee',
        processed_by_type = p_actor_type,
        processed_by_id   = p_actor_id,
        completed_at      = NOW(),
        updated_at        = NOW()
    WHERE id = v_tx.id;

    -- 13. History
    IF v_is_redirected THEN
        v_description := 'Transaction finalisée par ' || p_actor_type
                      || ' (redirigée : crédit agent ' || v_origin_agent_id
                      || ', débit agent ' || v_payout_agent_id || ')';
    ELSE
        v_description := 'Transaction finalisée par ' || p_actor_type;
    END IF;

    INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
    VALUES (
        'transaction_completed', p_actor_type, p_actor_id, 'transaction', v_tx.id, v_description,
        jsonb_build_object(
            'transaction_id',  v_tx.id,
            'actor_type',      p_actor_type,
            'gain',            v_gain,
            'gain_currency',   v_to_code,
            'is_redirected',   v_is_redirected,
            'origin_agent_id', v_origin_agent_id,
            'payout_agent_id', v_payout_agent_id,
            'sending_fee',     v_sending_fee,
            'total_debit',     v_total_debit
        )
    );

    -- 14. Résultat
    RETURN jsonb_build_object(
        'success',         true,
        'is_redirected',   v_is_redirected,
        'origin_agent_id', v_origin_agent_id,
        'payout_agent_id', v_payout_agent_id,
        'send_currency', jsonb_build_object(
            'code', v_from_code, 'symbol', v_from_symbol, 'agent_id', v_origin_agent_id,
            'before', v_old_send, 'credited', v_tx.send_amount, 'after', v_new_send
        ),
        'receive_currency', jsonb_build_object(
            'code', v_to_code, 'symbol', v_to_symbol, 'agent_id', v_payout_agent_id,
            'before', v_old_recv, 'paid_out', v_tx.receive_amount,
            'sending_fee', v_sending_fee, 'debited', v_total_debit, 'after', v_new_recv
        ),
        'gain', jsonb_build_object(
            'amount',          v_gain,
            'currency',        v_to_code,
            'currency_symbol', v_to_symbol,
            'agent_id',        v_origin_agent_id,
            'commission_rate', v_tx.commission_applied
        )
    );

EXCEPTION
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'LOCK_CONFLICT: Transaction ou ressource déjà en cours de traitement, réessayez';
END;
$$;

-- ===================================================================
-- VUES
-- ===================================================================
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT
    t.id,
    t.tracking_code,
    t.status,
    t.client_validated,
    t.processed_by_type,
    t.processed_by_id,

    cf.name             AS from_country,
    cf.phone_prefix     AS from_phone_prefix,
    ct.name             AS to_country,
    ct.phone_prefix     AS to_phone_prefix,

    curr_from.code      AS from_currency_code,
    curr_from.symbol    AS from_currency_symbol,
    curr_to.code        AS to_currency_code,
    curr_to.symbol      AS to_currency_symbol,

    t.sender_phone,
    t.receiver_phone,

    sm.method           AS sender_method,
    rm.method           AS receiver_method,

    t.send_amount,
    t.withdrawal_fee_percent,
    t.withdrawal_fee_amount,
    t.net_send_amount,
    t.receive_amount,

    t.sending_fee_percent,
    t.sending_fee_amount,
    t.total_debit_amount,

    t.rate_applied,
    t.commission_applied,

    a.id                AS agent_id,
    a.name              AS agent_name,
    a.email             AS agent_email,

    an.number           AS authorized_number,
    an.label            AS authorized_number_label,

    t.created_at,
    t.expires_at,
    t.completed_at,
    t.cancelled_at

FROM transactions t
JOIN  countries       cf   ON t.from_country_id      = cf.id
JOIN  countries       ct   ON t.to_country_id         = ct.id
JOIN  currencies      curr_from ON cf.currency_id     = curr_from.id
JOIN  currencies      curr_to   ON ct.currency_id     = curr_to.id
JOIN  payment_methods sm   ON t.sender_method_id      = sm.id
JOIN  payment_methods rm   ON t.receiver_method_id    = rm.id
LEFT JOIN agents      a    ON t.assigned_agent_id     = a.id
LEFT JOIN authorized_numbers an ON t.authorized_number_id = an.id;

CREATE OR REPLACE VIEW v_history_details AS
SELECT
    h.id,
    h.action_type,
    h.actor_type,
    h.actor_id,
    h.entity_type,
    h.entity_id,
    h.description,
    h.metadata,
    h.created_at,
    CASE
        WHEN h.actor_type = 'admin'      THEN a.name
        WHEN h.actor_type = 'semi-admin' THEN sa.name
        WHEN h.actor_type = 'agent'      THEN ag.name
        ELSE NULL
    END AS actor_name,
    CASE
        WHEN h.actor_type = 'admin'      THEN a.email
        WHEN h.actor_type = 'semi-admin' THEN sa.email
        WHEN h.actor_type = 'agent'      THEN ag.email
        ELSE NULL
    END AS actor_email
FROM history h
LEFT JOIN admins      a  ON h.actor_type = 'admin'      AND h.actor_id = a.id
LEFT JOIN semi_admins sa ON h.actor_type = 'semi-admin' AND h.actor_id = sa.id
LEFT JOIN agents      ag ON h.actor_type = 'agent'      AND h.actor_id = ag.id;

-- ===================================================================
-- INDEX DE PERFORMANCE
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_agent_status_date
    ON transactions (assigned_agent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_pending_expires
    ON transactions (status, expires_at)
    WHERE status = 'en_attente';

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
    ON transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gains_agent_currency
    ON gains (agent_id, currency_id);

CREATE INDEX IF NOT EXISTS idx_gains_created_at
    ON gains (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_balance_transactions_balance_id
    ON balance_transactions(balance_id);

CREATE INDEX IF NOT EXISTS idx_redirections_to_agent_status
    ON redirections (to_agent_id, status);

CREATE INDEX IF NOT EXISTS idx_redirections_from_agent
    ON redirections (from_agent_id);

CREATE INDEX IF NOT EXISTS idx_rates_currency_pair_active
    ON rates (from_currency_id, to_currency_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_history_actor
    ON history (actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_entity
    ON history (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_created_at
    ON history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_authorized_numbers_country_method
    ON authorized_numbers (country_id, payment_method_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_countries_is_active
    ON countries (is_active)
    WHERE is_active = true;

-- ===================================================================
-- FIN DU SCHÉMA CONSOLIDÉ
-- ===================================================================
