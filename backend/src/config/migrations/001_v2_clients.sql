-- ===================================================================
-- MIGRATION 001 — MoveCash V2 : comptes clients, carnets, notifications
-- ===================================================================
-- À exécuter APRÈS db.sql. Idempotente : peut être relancée sans risque
-- sur une base existante (IF NOT EXISTS / OR REPLACE partout).
--
-- Cahier des charges V2 couvert :
--   CPT-01..05  clients, client_login_codes, client_refresh_tokens
--               (connexion par e-mail + code envoyé via Resend, pas de SMS)
--   NUM-01..04  client_payment_accounts, beneficiaries
--   TRX-04/05   transactions.client_id, transaction_events (frise)
--   NOT-01..04  notifications, push_subscriptions
--
-- Statuts : on garde ceux du back-office. Correspondance avec le cahier :
--   en_attente → pending   | validee → paid / processing
--   effectuee  → completed | echouee → failed | annulee, expiree → cancelled
-- ===================================================================

BEGIN;

-- ===================================================================
-- 1. CLIENTS (connexion par e-mail + code à 6 chiffres, sans mot de passe)
-- ===================================================================
CREATE TABLE IF NOT EXISTS clients (
    id                   SERIAL PRIMARY KEY,
    email                VARCHAR(150) NOT NULL,                 -- identifiant de connexion, en minuscules
    phone                VARCHAR(20)  DEFAULT NULL,             -- E.164, non vérifié (pré-remplissage)
    country_id           INTEGER      NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    first_name           VARCHAR(100) NOT NULL,
    last_name            VARCHAR(100) NOT NULL,
    pin_hash             TEXT         DEFAULT NULL,             -- CPT-03 (bcrypt)
    language             VARCHAR(2)   NOT NULL DEFAULT 'fr',
    display_currency_id  INTEGER      DEFAULT NULL REFERENCES currencies(id) ON DELETE SET NULL,
    push_enabled         BOOLEAN      NOT NULL DEFAULT true,    -- NOT-04
    sound_enabled        BOOLEAN      NOT NULL DEFAULT true,
    announcements_enabled BOOLEAN     NOT NULL DEFAULT true,
    is_active            BOOLEAN      NOT NULL DEFAULT true,
    last_login_at        TIMESTAMP    DEFAULT NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP    DEFAULT NULL,

    CONSTRAINT valid_client_language CHECK (language IN ('fr', 'en')),
    CONSTRAINT valid_client_email    CHECK (email = LOWER(email) AND email LIKE '%_@_%'),
    CONSTRAINT valid_client_phone    CHECK (phone IS NULL OR phone ~ '^\+[0-9]{6,15}$')
);

-- Un e-mail = un compte actif (un compte supprimé libère l'adresse)
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_email
    ON clients (email) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------------------
-- Codes de connexion par e-mail (CPT-01/02) : 6 chiffres, 10 min, 5 essais max.
-- Le code n'est jamais stocké en clair (HMAC-SHA256).
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_login_codes (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(150) NOT NULL,
    code_hash     TEXT        NOT NULL,
    attempts      INTEGER     NOT NULL DEFAULT 0,
    ip            VARCHAR(64) DEFAULT NULL,
    expires_at    TIMESTAMP   NOT NULL,
    consumed_at   TIMESTAMP   DEFAULT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_login_codes_email_created
    ON client_login_codes (email, created_at DESC);

-- -------------------------------------------------------------------
-- Jetons de rafraîchissement (30 jours, révocables, stockés hachés)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_refresh_tokens (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER     NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    token_hash    TEXT        NOT NULL UNIQUE,
    device        VARCHAR(255) DEFAULT NULL,
    expires_at    TIMESTAMP   NOT NULL,
    revoked_at    TIMESTAMP   DEFAULT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_refresh_tokens_client
    ON client_refresh_tokens (client_id) WHERE revoked_at IS NULL;

-- ===================================================================
-- 2. MES NUMÉROS D'ENVOI (NUM-01)
-- ===================================================================
CREATE TABLE IF NOT EXISTS client_payment_accounts (
    id                  SERIAL PRIMARY KEY,
    client_id           INTEGER      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    label               VARCHAR(50)  DEFAULT NULL,                 -- « Perso », « Pro »…
    country_id          INTEGER      NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    payment_method_id   INTEGER      NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    phone               VARCHAR(20)  NOT NULL,                     -- format E.164, comme transactions.*_phone
    is_default          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP    DEFAULT NULL
);

-- Un seul numéro par défaut par client
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_payment_accounts_default
    ON client_payment_accounts (client_id)
    WHERE is_default AND deleted_at IS NULL;

-- Pas deux fois le même compte
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_payment_accounts_number
    ON client_payment_accounts (client_id, payment_method_id, phone)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_client_payment_accounts_updated_at ON client_payment_accounts;
CREATE TRIGGER trg_client_payment_accounts_updated_at BEFORE UPDATE ON client_payment_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- 3. BÉNÉFICIAIRES (NUM-02/03)
-- ===================================================================
CREATE TABLE IF NOT EXISTS beneficiaries (
    id                  SERIAL PRIMARY KEY,
    client_id           INTEGER      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    country_id          INTEGER      NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    payment_method_id   INTEGER      NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    phone               VARCHAR(20)  NOT NULL,                     -- format E.164, comme transactions.*_phone
    is_favorite         BOOLEAN      NOT NULL DEFAULT false,
    last_used_at        TIMESTAMP    DEFAULT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP    DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_beneficiaries_number
    ON beneficiaries (client_id, payment_method_id, phone)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_client
    ON beneficiaries (client_id, is_favorite DESC, last_used_at DESC NULLS LAST)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_beneficiaries_updated_at ON beneficiaries;
CREATE TRIGGER trg_beneficiaries_updated_at BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- 4. LIEN TRANSACTION → CLIENT (NULL = invité, TRX-06)
-- ===================================================================
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS client_id INTEGER DEFAULT NULL
        REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_client_date
    ON transactions (client_id, created_at DESC)
    WHERE client_id IS NOT NULL;

-- ===================================================================
-- 5. FRISE DES STATUTS (TRX-05) — alimentée automatiquement par trigger,
--    quel que soit le chemin de code qui change le statut.
-- ===================================================================
CREATE TABLE IF NOT EXISTS transaction_events (
    id               SERIAL PRIMARY KEY,
    transaction_id   INTEGER     NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    from_status      VARCHAR(20) DEFAULT NULL,                    -- NULL = création
    to_status        VARCHAR(20) NOT NULL,
    actor_type       VARCHAR(20) DEFAULT NULL,
    actor_id         INTEGER     DEFAULT NULL,
    note             TEXT        DEFAULT NULL,
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transaction_events_tx
    ON transaction_events (transaction_id, created_at);

CREATE OR REPLACE FUNCTION log_transaction_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO transaction_events (transaction_id, from_status, to_status, actor_type, actor_id)
        VALUES (NEW.id, NULL, NEW.status,
                CASE WHEN NEW.status = 'validee' THEN 'agent' ELSE 'client' END,
                CASE WHEN NEW.status = 'validee' THEN NEW.assigned_agent_id ELSE NEW.client_id END);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO transaction_events (transaction_id, from_status, to_status, actor_type, actor_id)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.processed_by_type, NEW.processed_by_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_status_event ON transactions;
CREATE TRIGGER trg_transactions_status_event
    AFTER INSERT OR UPDATE OF status ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_transaction_status_event();

-- ===================================================================
-- 6. NOTIFICATIONS (NOT-03) et abonnements Web Push (NOT-02)
-- ===================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type          VARCHAR(30)  NOT NULL,                  -- 'transaction_status' | 'announcement'
    title         VARCHAR(150) NOT NULL,
    body          TEXT         DEFAULT NULL,
    link          VARCHAR(255) DEFAULT NULL,
    data          JSONB        DEFAULT NULL,
    read_at       TIMESTAMP    DEFAULT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_client_date
    ON notifications (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_client_unread
    ON notifications (client_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    endpoint      TEXT         NOT NULL UNIQUE,
    p256dh        TEXT         NOT NULL,
    auth          TEXT         NOT NULL,
    device        VARCHAR(255) DEFAULT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client
    ON push_subscriptions (client_id);

COMMIT;
