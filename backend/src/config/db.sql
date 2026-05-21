-- ===================================================================
-- SCHÉMA BASE DE DONNÉES — Plateforme de transfert Russie ↔ Afrique
-- Stack : PostgreSQL
-- Version : 2.0 — Mise à jour complète
-- ===================================================================
-- ORDRE DE CRÉATION (respect des dépendances FK) :
--   1. admins v
--   2. semi_admins v
--   3. currencies v
--   4. countries v
--   5. agents v
--   6. payment_methods v
--   7. balances v
--   8. authorized_numbers v
--   9. rates v
--  10. transactions v
--  11. gains
--  12. redirections
--  13. history
--  14. Fonctions + Triggers
--  15. Vue
--  16. Index
-- ===================================================================

-- email unique
ALTER TABLE admins ADD CONSTRAINT unique_admin_email UNIQUE (email);
ALTER TABLE semi_admins ADD CONSTRAINT unique_semi_admin_email UNIQUE (email);

-- code devise unique
ALTER TABLE currencies ADD CONSTRAINT unique_currency_code UNIQUE (code);
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
    code          VARCHAR(3)   NOT NULL UNIQUE,   -- ISO 3166-1 alpha-3 (ex: CIV, RUS, CMR)
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
    -- Autorisation accordée par un admin pour traiter les transactions
    can_process     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP DEFAULT NULL
);

-- ===================================================================
-- 6. MOYENS DE PAIEMENT (liés à un pays)
-- ===================================================================
CREATE TABLE payment_methods (
    id            SERIAL PRIMARY KEY,
    country_id    INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    method        VARCHAR(100) NOT NULL,          -- ex: "Orange Money", "SberBank", "MTN MoMo"
    currency_id   INTEGER NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP DEFAULT NULL,

    UNIQUE (country_id, method)
);

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
CREATE TABLE IF NOT EXISTS balance_transactions (
    id SERIAL PRIMARY KEY,
    balance_id INTEGER NOT NULL REFERENCES balances(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE DES SNAPSHOTS DE BALANCES
-- Enregistre la valeur totale de toutes les balances (en RUB)
-- à un instant donné. Alimentée par take_balance_snapshot().
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_type   VARCHAR(20) NOT NULL,          -- 'start_of_day' | 'end_of_day'
    snapshot_date   DATE        NOT NULL,
    total_rub       NUMERIC(20, 2) NOT NULL,       -- valeur totale convertie en RUB
    detail          JSONB DEFAULT NULL,             -- détail par agent et par devise
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
 
    UNIQUE (snapshot_type, snapshot_date)
);

CREATE INDEX idx_balance_transactions_balance_id ON balance_transactions(balance_id);
-- ===================================================================
-- 8. NUMÉROS AGRÉÉS DE TRANSFERT
-- ===================================================================
CREATE TABLE authorized_numbers (
    id                  SERIAL PRIMARY KEY,
    agent_id            INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    country_id          INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    payment_method_id   INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    number              VARCHAR(50) NOT NULL,
    label               VARCHAR(100) DEFAULT NULL,   -- description optionnelle
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
    commission_percent  NUMERIC(5, 2)  NOT NULL DEFAULT 0.75,
    -- Taux interne = taux client + 0.20 (pour le calcul du bénéfice admin)
    -- Calculé dynamiquement : rate + 0.20, pas stocké
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_by          INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP DEFAULT NULL,

    CONSTRAINT positive_rate       CHECK (rate > 0),
    CONSTRAINT valid_commission    CHECK (commission_percent >= 0 AND commission_percent <= 100),
    CONSTRAINT different_currencies CHECK (from_currency_id != to_currency_id),
    -- Un seul taux actif par paire de devises à la fois
    UNIQUE (from_currency_id, to_currency_id)
);

-- ===================================================================
-- 10. TRANSACTIONS PRINCIPALES
-- ===================================================================
-- Statuts possibles :
--   en_attente  → créée, en attente du virement client
--   validee     → client a cliqué "J'ai payé", en attente traitement agent
--   effectuee   → agent a traité et confirmé
--   echouee     → traitement échoué
--   expiree     → délai dépassé sans validation client
--   annulee     → annulée manuellement
-- ===================================================================
CREATE TABLE transactions (
    id                      SERIAL PRIMARY KEY,
    tracking_code           VARCHAR(30) UNIQUE NOT NULL,

    -- Pays
    from_country_id         INTEGER NOT NULL REFERENCES countries(id),
    to_country_id           INTEGER NOT NULL REFERENCES countries(id),

    -- Téléphones (préfixe inclus dans la saisie)
    sender_phone            VARCHAR(30) NOT NULL,
    receiver_phone          VARCHAR(30) NOT NULL,

    -- Moyens de paiement
    sender_method_id        INTEGER NOT NULL REFERENCES payment_methods(id),
    receiver_method_id      INTEGER NOT NULL REFERENCES payment_methods(id),

    -- Montants
    send_amount             NUMERIC(20, 2) NOT NULL,
    receive_amount          NUMERIC(20, 2) NOT NULL,

    -- Taux et commission snapshot (historique au moment de la transaction)
    rate_applied            NUMERIC(20, 6) NOT NULL,
    commission_applied      NUMERIC(5, 2)  NOT NULL,

    -- Statut
    status                  VARCHAR(20) NOT NULL DEFAULT 'en_attente',

    -- Assignation
    assigned_agent_id       INTEGER REFERENCES agents(id),
    authorized_number_id    INTEGER REFERENCES authorized_numbers(id),

    -- Validation client (a cliqué sur "J'ai payé")
    client_validated        BOOLEAN NOT NULL DEFAULT false,

    -- Qui a traité (admin, semi_admin ou agent)
    processed_by_type       VARCHAR(20) DEFAULT NULL,   -- 'admin', 'semi_admin', 'agent'
    processed_by_id         INTEGER DEFAULT NULL,

    -- Temporisation
    expires_at              TIMESTAMP DEFAULT NULL,     -- 5 min après création
    completed_at            TIMESTAMP DEFAULT NULL,
    cancelled_at            TIMESTAMP DEFAULT NULL,

    -- Audit
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes métier
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
-- Un gain est enregistré par transaction traitée.
-- Le gain = receive_amount * commission_percent / 100
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
-- 12. REDIRECTIONS (fonds insuffisants ou délégation)
-- ===================================================================
-- Créée quand un agent redirige une transaction vers un autre agent.
-- Le gain reste à l'agent initial (from_agent_id).
-- ===================================================================
CREATE TABLE redirections (
    id                  SERIAL PRIMARY KEY,
    transaction_id      INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    from_agent_id       INTEGER NOT NULL REFERENCES agents(id),
    to_agent_id         INTEGER NOT NULL REFERENCES agents(id),
    redirected_amount   NUMERIC(20, 2) NOT NULL,
    reason              TEXT DEFAULT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, accepted, rejected
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
    action_type   VARCHAR(100) NOT NULL,   -- transaction_created, balance_updated, rate_changed…
    actor_type    VARCHAR(20)  NOT NULL,   -- admin, semi_admin, agent, client, system
    actor_id      INTEGER DEFAULT NULL,    -- NULL pour client ou system
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

-- Génère un code de suivi unique (format : TRX + timestamp 8 car + 5 car alphanum)
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
        SELECT EXISTS(
            SELECT 1 FROM transactions WHERE tracking_code = new_code
        ) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;


-- Calcul du gain agent : receive_amount * commission / 100, arrondi à l'entier
CREATE OR REPLACE FUNCTION calculate_agent_gain(
    p_receive_amount    NUMERIC,
    p_commission_percent NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN ROUND(p_receive_amount * p_commission_percent / 100, 0);
END;
$$ LANGUAGE plpgsql;


-- Met à jour updated_at automatiquement sur UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ===================================================================
-- TRIGGERS updated_at
-- ===================================================================
CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_semi_admins_updated_at
    BEFORE UPDATE ON semi_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_countries_updated_at
    BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_authorized_numbers_updated_at
    BEFORE UPDATE ON authorized_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rates_updated_at
    BEFORE UPDATE ON rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_redirections_updated_at
    BEFORE UPDATE ON redirections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ===================================================================
-- VUE — Détail complet d'une transaction
-- ===================================================================
CREATE VIEW v_transaction_details AS
SELECT
    t.id,
    t.tracking_code,
    t.status,
    t.client_validated,
    t.processed_by_type,
    t.processed_by_id,

    -- Pays
    cf.name             AS from_country,
    cf.phone_prefix     AS from_phone_prefix,
    ct.name             AS to_country,
    ct.phone_prefix     AS to_phone_prefix,

    -- Devises
    curr_from.code      AS from_currency_code,
    curr_from.symbol    AS from_currency_symbol,
    curr_to.code        AS to_currency_code,
    curr_to.symbol      AS to_currency_symbol,

    -- Téléphones
    t.sender_phone,
    t.receiver_phone,

    -- Moyens de paiement
    sm.method           AS sender_method,
    rm.method           AS receiver_method,

    -- Montants
    t.send_amount,
    t.receive_amount,
    t.rate_applied,
    t.commission_applied,

    -- Agent assigné
    a.id                AS agent_id,
    a.name              AS agent_name,
    a.email             AS agent_email,

    -- Numéro agréé affiché au client
    an.number           AS authorized_number,
    an.label            AS authorized_number_label,

    -- Dates
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


-- ===================================================================
-- INDEX DE PERFORMANCE
-- ===================================================================

-- Transactions : filtre par agent + statut (requête la plus fréquente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_agent_status_date
    ON transactions (assigned_agent_id, status, created_at DESC);

-- Transactions : nettoyage des expirées
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending_expires
    ON transactions (status, expires_at)
    WHERE status = 'en_attente';

-- Transactions : recherche par code de suivi (client tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tracking_code
    ON transactions (tracking_code);

-- Transactions : filtre par date (dashboard admin)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at
    ON transactions (created_at DESC);

-- Gains : par agent + devise
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gains_agent_currency
    ON gains (agent_id, currency_id);

-- Gains : par date (rapport mensuel)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gains_created_at
    ON gains (created_at DESC);

-- Balances : upserts fréquents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balances_agent_currency
    ON balances (agent_id, currency_id);

-- Redirections : par agent destinataire + statut
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_redirections_to_agent_status
    ON redirections (to_agent_id, status);

-- Redirections : par agent source
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_redirections_from_agent
    ON redirections (from_agent_id);

-- Taux : recherche par paire de devises active
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rates_currency_pair_active
    ON rates (from_currency_id, to_currency_id)
    WHERE is_active = true;

-- Historique : recherche par acteur
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_history_actor
    ON history (actor_type, actor_id, created_at DESC);

-- Historique : recherche par entité
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_history_entity
    ON history (entity_type, entity_id, created_at DESC);

-- Numéros agréés : recherche par pays + méthode (sélection d'agent au moment de la transaction)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_authorized_numbers_country_method
    ON authorized_numbers (country_id, payment_method_id)
    WHERE is_active = true;



-- Optionnel : créer un déclencheur pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_semi_admins_updated_at
BEFORE UPDATE ON semi_admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- À exécuter UNE FOIS sur ta DB Render (PSQL Command ou pgAdmin)
-- Cette fonction fait tout en une seule transaction atomique côté PostgreSQL :
-- vérifications, mise à jour balances, insertion gain, finalisation transaction.
-- Node.js n'a plus qu'à appeler SELECT finalize_transaction($1, $2, $3)

CREATE OR REPLACE FUNCTION finalize_transaction(
  p_transaction_id  INT,
  p_actor_type      TEXT,  -- 'admin', 'semi-admin', 'agent'
  p_actor_id        INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx              transactions%ROWTYPE;
  v_agent           agents%ROWTYPE;
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
  v_gain            NUMERIC;
BEGIN
  -- 1. Lock transaction (NOWAIT → erreur immédiate si déjà lockée)
  SELECT * INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSACTION_NOT_FOUND';
  END IF;

  IF v_tx.status <> 'validee' THEN
    RAISE EXCEPTION 'TRANSACTION_NOT_VALIDATED: status=%', v_tx.status;
  END IF;

  -- 2. Vérifier droits agent
  IF p_actor_type = 'agent' AND v_tx.assigned_agent_id <> p_actor_id THEN
    RAISE EXCEPTION 'AGENT_NOT_AUTHORIZED';
  END IF;

  -- 3. Lock agent (ordre strict : transactions → agents → balances)
  SELECT * INTO v_agent
  FROM agents
  WHERE id = v_tx.assigned_agent_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND OR NOT v_agent.is_active THEN
    RAISE EXCEPTION 'AGENT_INACTIVE';
  END IF;

  IF p_actor_type = 'agent' AND NOT v_agent.can_process THEN
    RAISE EXCEPTION 'AGENT_CANNOT_PROCESS';
  END IF;

  -- 4. Récupérer currency IDs (lecture simple, tables statiques)
  SELECT
    curr_from.id, curr_from.code, curr_from.symbol,
    curr_to.id,   curr_to.code,   curr_to.symbol
  INTO
    v_from_currency, v_from_code, v_from_symbol,
    v_to_currency,   v_to_code,   v_to_symbol
  FROM countries c_from
  JOIN countries c_to       ON c_to.id = v_tx.to_country_id
  JOIN currencies curr_from ON curr_from.id = c_from.currency_id
  JOIN currencies curr_to   ON curr_to.id   = c_to.currency_id
  WHERE c_from.id = v_tx.from_country_id;

  IF v_from_currency IS NULL THEN
    RAISE EXCEPTION 'CURRENCIES_NOT_FOUND';
  END IF;

  -- 5. Lock les deux balances en ordre déterministe (currency_id ASC → pas de deadlock)
  SELECT * INTO v_send_bal
  FROM balances
  WHERE agent_id = v_agent.id AND currency_id = v_from_currency
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BALANCE_NOT_FOUND_SEND: currency=%', v_from_code;
  END IF;

  SELECT * INTO v_recv_bal
  FROM balances
  WHERE agent_id = v_agent.id AND currency_id = v_to_currency
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BALANCE_NOT_FOUND_RECV: currency=%', v_to_code;
  END IF;

  -- 6. Vérifier fonds suffisants
  v_old_recv := v_recv_bal.amount;
  IF v_old_recv < v_tx.receive_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: available=%, required=%',
      v_old_recv, v_tx.receive_amount;
  END IF;

  -- 7. Calculer nouveaux montants
  v_old_send := v_send_bal.amount;
  v_new_send := v_old_send + v_tx.send_amount;
  v_new_recv := v_old_recv - v_tx.receive_amount;
  v_gain     := ROUND((v_tx.receive_amount * v_tx.commission_applied) / 100, 2);

  -- 8. Mise à jour balances
  UPDATE balances SET amount = v_new_send, updated_at = NOW()
  WHERE id = v_send_bal.id;

  UPDATE balances SET amount = v_new_recv, updated_at = NOW()
  WHERE id = v_recv_bal.id;

  -- 9. Enregistrer gain
  INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied, created_at)
  VALUES (v_tx.id, v_agent.id, v_to_currency, v_gain, v_tx.commission_applied, NOW());

  -- 10. Finaliser transaction
  UPDATE transactions
  SET status           = 'effectuee',
      processed_by_type = p_actor_type,
      processed_by_id   = p_actor_id,
      completed_at      = NOW(),
      updated_at        = NOW()
  WHERE id = v_tx.id;

  -- 11. Log history
  INSERT INTO history (action_type, actor_type, actor_id, entity_type, entity_id, description, metadata)
  VALUES (
    'transaction_completed',
    p_actor_type,
    p_actor_id,
    'transaction',
    v_tx.id,
    'Transaction finalisée par ' || p_actor_type,
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'actor_type',     p_actor_type,
      'gain',           v_gain,
      'gain_currency',  v_to_code
    )
  );

  -- 12. Retourner le résultat complet
  RETURN jsonb_build_object(
    'success', true,
    'send_currency', jsonb_build_object(
      'code',     v_from_code,
      'symbol',   v_from_symbol,
      'before',   v_old_send,
      'credited', v_tx.send_amount,
      'after',    v_new_send
    ),
    'receive_currency', jsonb_build_object(
      'code',     v_to_code,
      'symbol',   v_to_symbol,
      'before',   v_old_recv,
      'debited',  v_tx.receive_amount,
      'after',    v_new_recv
    ),
    'gain', jsonb_build_object(
      'amount',          v_gain,
      'currency',        v_to_code,
      'currency_symbol', v_to_symbol,
      'commission_rate', v_tx.commission_applied
    )
  );

EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'LOCK_CONFLICT: Transaction ou ressource déjà en cours de traitement, réessayez';
END;
$$;

-- À exécuter UNE FOIS sur ta DB Render

CREATE OR REPLACE FUNCTION validate_transaction_by_client(
  p_transaction_id INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx transactions%ROWTYPE;
BEGIN
  -- 1. Lock + vérification en une seule requête (NOWAIT → erreur immédiate)
  SELECT * INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id
    AND status = 'en_attente'
    AND expires_at > NOW()
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    -- Distinguer "expirée" de "introuvable" pour un message précis
    IF EXISTS (SELECT 1 FROM transactions WHERE id = p_transaction_id) THEN
      RAISE EXCEPTION 'TRANSACTION_EXPIRED: Transaction expirée ou déjà validée';
    ELSE
      RAISE EXCEPTION 'TRANSACTION_NOT_FOUND: Transaction introuvable';
    END IF;
  END IF;

  -- 2. Valider
  UPDATE transactions
  SET client_validated = true,
      status           = 'validee',
      updated_at       = NOW()
  WHERE id = v_tx.id
  RETURNING * INTO v_tx;

  -- 3. Logger dans history
  INSERT INTO history (
    action_type, actor_type, actor_id,
    entity_type, entity_id,
    description, metadata
  )
  VALUES (
    'transaction_client_validated',
    'client', NULL,
    'transaction', v_tx.id,
    'Transaction validée par le client',
    jsonb_build_object('transaction_id', v_tx.id)
  );

  -- 4. Retourner la transaction mise à jour
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

-- ───────────────────────────────────────────────────────────────────
-- 2. FONCTION : prendre un snapshot des balances
-- Convertit toutes les balances en RUB via le taux interne (rate + 0.20).
-- Les balances déjà en RUB sont prises telles quelles.
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION take_balance_snapshot(
    p_type  VARCHAR  -- 'start_of_day' ou 'end_of_day'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_rub_currency_id   INT;
    v_total_rub         NUMERIC := 0;
    v_detail            JSONB   := '[]'::JSONB;
    v_row               RECORD;
    v_rate_to_rub       NUMERIC;
    v_amount_in_rub     NUMERIC;
    v_snapshot_date     DATE := CURRENT_DATE;
BEGIN
    -- Récupérer l'ID de la devise RUB
    SELECT id INTO v_rub_currency_id FROM currencies WHERE code = 'RUB';
    IF v_rub_currency_id IS NULL THEN
        RAISE EXCEPTION 'CURRENCY_RUB_NOT_FOUND';
    END IF;
 
    -- Parcourir toutes les balances actives (agents non supprimés)
    FOR v_row IN
        SELECT
            b.id            AS balance_id,
            b.agent_id,
            a.name          AS agent_name,
            b.currency_id,
            c.code          AS currency_code,
            b.amount
        FROM balances b
        JOIN agents     a ON a.id = b.agent_id  AND a.deleted_at IS NULL
        JOIN currencies c ON c.id = b.currency_id
        WHERE b.amount > 0
    LOOP
        IF v_row.currency_id = v_rub_currency_id THEN
            -- Balance déjà en RUB : pas de conversion
            v_amount_in_rub := v_row.amount;
        ELSE
            -- Trouver le taux interne : devises étrangères → RUB
            -- Le taux dans la table est "1 RUB = X devise_étrangère"
            -- Donc pour convertir devise → RUB : montant / (rate + 0.20)
            SELECT rate INTO v_rate_to_rub
            FROM rates
            WHERE from_currency_id = v_rub_currency_id
              AND to_currency_id   = v_row.currency_id
              AND is_active = true
            LIMIT 1;
 
            IF v_rate_to_rub IS NULL THEN
                -- Pas de taux connu → on ignore cette balance (log dans detail)
                v_amount_in_rub := 0;
                v_detail := v_detail || jsonb_build_object(
                    'agent_id',       v_row.agent_id,
                    'agent_name',     v_row.agent_name,
                    'currency',       v_row.currency_code,
                    'amount',         v_row.amount,
                    'amount_rub',     0,
                    'warning',        'Taux introuvable, balance ignorée'
                );
                CONTINUE;
            END IF;
 
            -- Taux interne = taux client + 0.20
            -- 1 RUB = (rate + 0.20) devise_étrangère
            -- donc 1 devise_étrangère = 1 / (rate + 0.20) RUB
            v_amount_in_rub := ROUND(v_row.amount / (v_rate_to_rub + 0.20), 2);
        END IF;
 
        v_total_rub := v_total_rub + v_amount_in_rub;
 
        v_detail := v_detail || jsonb_build_object(
            'agent_id',    v_row.agent_id,
            'agent_name',  v_row.agent_name,
            'currency',    v_row.currency_code,
            'amount',      v_row.amount,
            'amount_rub',  v_amount_in_rub
        );
    END LOOP;