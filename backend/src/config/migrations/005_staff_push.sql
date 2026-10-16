-- ===================================================================
-- MIGRATION 005 — Notifications push du personnel (remplacent les e-mails)
-- ===================================================================
-- À exécuter après 004_v2_announcements.sql. Idempotente.
--
-- Admins, semi-admins et agents reçoivent en push ce qu'ils recevaient par
-- e-mail (nouvelle transaction, redirection) + « paiement confirmé, à traiter ».
-- Table séparée de push_subscriptions (clients) : les comptes du personnel
-- vivent dans trois tables (admins, semi_admins, agents).
-- ===================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS staff_push_subscriptions (
    id           SERIAL PRIMARY KEY,
    staff_role   VARCHAR(12)  NOT NULL,
    staff_id     INTEGER      NOT NULL,
    endpoint     TEXT         NOT NULL UNIQUE,
    p256dh       TEXT         NOT NULL,
    auth         TEXT         NOT NULL,
    device       VARCHAR(255) DEFAULT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_staff_push_role CHECK (staff_role IN ('admin', 'semi-admin', 'agent'))
);

CREATE INDEX IF NOT EXISTS idx_staff_push_role_id
    ON staff_push_subscriptions (staff_role, staff_id);

COMMIT;
