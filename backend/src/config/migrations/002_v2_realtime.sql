-- ===================================================================
-- MIGRATION 002 — MoveCash V2 : temps réel (cahier V2 · §7, NOT-01..05)
-- ===================================================================
-- À exécuter après 001_v2_clients.sql. Idempotente.
--
-- Principe : « chaque événement est d'abord enregistré en base, puis diffusé ».
--   1. Un changement de statut écrit transaction_events + la notification du
--      client, dans la même transaction SQL que le changement lui-même.
--   2. pg_notify('movecash_events', …) prévient le serveur Node, qui diffuse
--      via Socket.IO. PostgreSQL ne délivre le NOTIFY qu'au COMMIT : une
--      opération annulée (ROLLBACK) ne diffuse jamais rien.
-- Tous les chemins de code sont couverts (agent, admin, job d'expiration,
-- redirections…) sans les modifier un par un.
-- ===================================================================

BEGIN;

CREATE OR REPLACE FUNCTION log_transaction_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_id  INT;
    v_notif_id  INT;
    v_title     TEXT;
    v_body      TEXT;
    v_to_cur    TEXT;
    v_name      TEXT;
BEGIN
    -- ── Création : frise + signal « nouvelle transaction » pour le back-office (NOT-05)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO transaction_events (transaction_id, from_status, to_status, actor_type, actor_id)
        VALUES (NEW.id, NULL, NEW.status,
                CASE WHEN NEW.status = 'validee' THEN 'agent' ELSE 'client' END,
                CASE WHEN NEW.status = 'validee' THEN NEW.assigned_agent_id ELSE NEW.client_id END)
        RETURNING id INTO v_event_id;

        PERFORM pg_notify('movecash_events', json_build_object(
            'kind',              'created',
            'transaction_id',    NEW.id,
            'tracking_code',     NEW.tracking_code,
            'status',            NEW.status,
            'assigned_agent_id', NEW.assigned_agent_id,
            'event_id',          v_event_id
        )::TEXT);
        RETURN NEW;
    END IF;

    -- ── Changement de statut : frise + notification client + signal (NOT-01)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO transaction_events (transaction_id, from_status, to_status, actor_type, actor_id)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.processed_by_type, NEW.processed_by_id)
        RETURNING id INTO v_event_id;

        IF NEW.client_id IS NOT NULL THEN
            SELECT cur.code INTO v_to_cur
            FROM countries c JOIN currencies cur ON cur.id = c.currency_id
            WHERE c.id = NEW.to_country_id;

            SELECT b.name INTO v_name
            FROM beneficiaries b
            WHERE b.client_id = NEW.client_id
              AND b.payment_method_id = NEW.receiver_method_id
              AND b.phone = NEW.receiver_phone
              AND b.deleted_at IS NULL
            LIMIT 1;
            v_name := COALESCE(v_name, NEW.receiver_phone);

            CASE NEW.status
                WHEN 'validee' THEN
                    v_title := 'Paiement confirmé';
                    v_body  := 'Transfert en cours vers ' || v_name || ' · ' || NEW.tracking_code;
                WHEN 'effectuee' THEN
                    v_title := 'Transfert terminé';
                    v_body  := v_name || ' a reçu ' || REPLACE(NEW.receive_amount::TEXT, '.', ',')
                               || ' ' || COALESCE(v_to_cur, '') || ' · ' || NEW.tracking_code;
                WHEN 'echouee' THEN
                    v_title := 'Transfert échoué';
                    v_body  := 'Contactez le support avec la référence ' || NEW.tracking_code;
                WHEN 'annulee' THEN
                    v_title := 'Transfert annulé';
                    v_body  := 'La transaction ' || NEW.tracking_code || ' a été annulée';
                WHEN 'expiree' THEN
                    v_title := 'Délai de paiement dépassé';
                    v_body  := 'La transaction ' || NEW.tracking_code || ' a expiré. Refaites un envoi si besoin.';
                ELSE
                    v_title := NULL;
            END CASE;

            IF v_title IS NOT NULL THEN
                INSERT INTO notifications (client_id, type, title, body, link, data)
                VALUES (
                    NEW.client_id, 'transaction_status', v_title, v_body,
                    '/transactions/' || NEW.tracking_code,
                    jsonb_build_object(
                        'transaction_id', NEW.id,
                        'tracking_code',  NEW.tracking_code,
                        'from_status',    OLD.status,
                        'to_status',      NEW.status
                    )
                )
                RETURNING id INTO v_notif_id;
            END IF;
        END IF;

        PERFORM pg_notify('movecash_events', json_build_object(
            'kind',              'status',
            'transaction_id',    NEW.id,
            'tracking_code',     NEW.tracking_code,
            'from_status',       OLD.status,
            'to_status',         NEW.status,
            'client_id',         NEW.client_id,
            'assigned_agent_id', NEW.assigned_agent_id,
            'event_id',          v_event_id,
            'notification_id',   v_notif_id
        )::TEXT);
    END IF;

    -- ── Réassignation (redirection acceptée) : le nouvel agent la voit arriver
    IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
        PERFORM pg_notify('movecash_events', json_build_object(
            'kind',           'assigned',
            'transaction_id', NEW.id,
            'tracking_code',  NEW.tracking_code,
            'status',         NEW.status,
            'from_agent_id',  OLD.assigned_agent_id,
            'to_agent_id',    NEW.assigned_agent_id
        )::TEXT);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_status_event ON transactions;
CREATE TRIGGER trg_transactions_status_event
    AFTER INSERT OR UPDATE OF status, assigned_agent_id ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_transaction_status_event();

-- ===================================================================
-- Taux de change modifiés → diffusion à tous (rates:update)
-- ===================================================================
CREATE OR REPLACE FUNCTION notify_rates_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify('movecash_events', '{"kind":"rates"}');
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_rates_notify ON rates;
CREATE TRIGGER trg_rates_notify
    AFTER INSERT OR UPDATE OR DELETE ON rates
    FOR EACH STATEMENT EXECUTE FUNCTION notify_rates_changed();

COMMIT;
