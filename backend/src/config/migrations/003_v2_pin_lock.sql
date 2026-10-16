-- ===================================================================
-- MIGRATION 003 — MoveCash V2 : verrouillage de l'app par code PIN
-- ===================================================================
-- À exécuter après 002_v2_realtime.sql. Idempotente.
--
-- Le PIN (CPT-03) déverrouille l'app à l'ouverture. Les échecs sont comptés
-- côté serveur : au 5e, toutes les sessions du client sont fermées et il doit
-- se reconnecter par e-mail. Un PIN de 4 chiffres ne doit pas pouvoir être
-- essayé sans limite.
-- ===================================================================

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER NOT NULL DEFAULT 0;
