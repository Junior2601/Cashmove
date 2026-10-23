-- ===================================================================
-- MIGRATION 008 — Agent assigné : plus de restriction sur le pays de l'agent
-- ===================================================================
-- À exécuter après 007_notification_settings.sql. Idempotente.
--
-- Avant : create_transaction ne choisissait que des agents dont le pays
-- (agents.country_id) était le pays d'envoi.
-- Maintenant : tout agent actif qui a un numéro agréé actif dans le pays
-- d'envoi, pour le moyen de paiement du client, peut être choisi.
-- Le numéro agréé reste celui du pays d'envoi (le client paie dessus).
-- ===================================================================

BEGIN;

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

    -- Agent choisi au hasard parmi ceux qui ont un numéro agréé actif dans le
    -- pays d'envoi pour le moyen de paiement du client, QUEL QUE SOIT le pays
    -- de l'agent (le client paie sur ce numéro).
    SELECT a.* INTO v_agent
    FROM agents a
    JOIN authorized_numbers an ON an.agent_id = a.id
    WHERE an.country_id         = p_from_country_id
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
      AND is_active         = true
      AND deleted_at        IS NULL
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

COMMIT;
