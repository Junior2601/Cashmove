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
--  10. transactions
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
        processed_by_type IS NULL OR processed_by_type IN ('admin', 'semi_admin', 'agent')
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
        actor_type IN ('admin', 'semi_admin', 'agent', 'client', 'system')
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


-- ===================================================================
-- DONNÉES DE RÉFÉRENCE INITIALES (optionnel — à adapter)
-- ===================================================================

-- Devises
INSERT INTO currencies (code, name, symbol) VALUES
    ('RUB', 'Rouble russe',        '₽'),
    ('XOF', 'Franc CFA UEMOA',     'FCFA'),
    ('XAF', 'Franc CFA CEMAC',     'FCFA'),
    ('EUR', 'Euro',                 '€');

-- Pays (currency_id à adapter selon l'INSERT au-dessus)
-- RUB = 1, XOF = 2, XAF = 3
INSERT INTO countries (name, code, phone_prefix, currency_id) VALUES
    ('Russie',       'RUS', '+7',   1),
    ('Côte d''Ivoire','CIV', '+225', 2),
    ('Mali',         'MLI', '+223', 2),
    ('Bénin',        'BEN', '+229', 2),
    ('Cameroun',     'CMR', '+237', 3),
    ('Congo',        'COG', '+242', 3),
    ('Gabon',        'GAB', '+241', 3);
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
