-- ===================================================================
-- MIGRATION 007 — Préférences de notifications du personnel
-- ===================================================================
-- À exécuter après 006_profit_rules.sql. Idempotente.
--
-- Chaque admin, semi-admin ou agent choisit les événements qui lui envoient
-- une notification push (page « Paramètres »). Pas de ligne = tout activé.
-- Les clients ont déjà leurs réglages dans la table clients
-- (push_enabled, sound_enabled, announcements_enabled).
-- ===================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS staff_notification_settings (
    staff_role         VARCHAR(12) NOT NULL,
    staff_id           INTEGER     NOT NULL,
    new_transaction    BOOLEAN     NOT NULL DEFAULT true,   -- nouvelle transaction
    payment_confirmed  BOOLEAN     NOT NULL DEFAULT true,   -- client a payé : à traiter (agents)
    redirection        BOOLEAN     NOT NULL DEFAULT true,   -- redirection proposée / reçue
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (staff_role, staff_id),
    CONSTRAINT valid_staff_settings_role CHECK (staff_role IN ('admin', 'semi-admin', 'agent'))
);

COMMIT;
