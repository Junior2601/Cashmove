-- ===================================================================
-- MIGRATION 004 — MoveCash V2 : annonces programmées
-- ===================================================================
-- À exécuter après 003_v2_pin_lock.sql. Idempotente.
--
-- L'admin peut envoyer une annonce tout de suite ou la programmer.
-- Un job (backend/src/jobs/announcements.js) envoie chaque minute les annonces
-- arrivées à échéance. scheduled_at est en TIMESTAMPTZ : l'heure choisie par
-- l'admin dans son navigateur est conservée sans ambiguïté de fuseau.
--
-- Statuts : scheduled → sending → sent   |   scheduled → cancelled
--           sending → failed (erreur, ou serveur arrêté pendant l'envoi)
-- ===================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS announcements (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(150) NOT NULL,
    body          TEXT         DEFAULT NULL,
    link          VARCHAR(255) DEFAULT NULL,
    scheduled_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    status        VARCHAR(12)  NOT NULL DEFAULT 'scheduled',
    recipients    INTEGER      DEFAULT NULL,
    sent_at       TIMESTAMPTZ  DEFAULT NULL,
    error         TEXT         DEFAULT NULL,
    created_by    INTEGER      DEFAULT NULL REFERENCES admins(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_announcement_status
        CHECK (status IN ('scheduled', 'sending', 'sent', 'cancelled', 'failed'))
);

-- Le job ne parcourt que les annonces en attente
CREATE INDEX IF NOT EXISTS idx_announcements_due
    ON announcements (scheduled_at)
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_announcements_created
    ON announcements (created_at DESC);

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Chaque notification d'annonce pointe vers son annonce (statistiques de lecture)
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS announcement_id INTEGER DEFAULT NULL
        REFERENCES announcements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_announcement
    ON notifications (announcement_id)
    WHERE announcement_id IS NOT NULL;

COMMIT;
