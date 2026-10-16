-- ===================================================================
-- DONNÉES DE TEST — base LOCALE uniquement (npm run db:reset-local)
-- ===================================================================
-- Comptes du back-office : mot de passe commun remplacé par le script
-- (__STAFF_PASSWORD_HASH__ = bcrypt du mot de passe affiché à la fin).
-- Les clients se créent eux-mêmes via /connexion (code e-mail).
-- ===================================================================

-- Devises
INSERT INTO currencies (code, name, symbol) VALUES
    ('RUB', 'Rouble russe',      '₽'),
    ('XOF', 'Franc CFA (UEMOA)', 'F'),
    ('XAF', 'Franc CFA (CEMAC)', 'FCFA');

-- Pays (les noms correspondent aux drapeaux de frontend/public/flags)
INSERT INTO countries (name, code, phone_prefix, currency_id) VALUES
    ('Russie',        'RUS', '+7',   (SELECT id FROM currencies WHERE code = 'RUB')),
    ('Côte d''Ivoire', 'CIV', '+225', (SELECT id FROM currencies WHERE code = 'XOF')),
    ('Cameroun',      'CMR', '+237', (SELECT id FROM currencies WHERE code = 'XAF'));

-- Moyens de paiement (frais de retrait côté envoi, frais d'envoi côté réception)
INSERT INTO payment_methods (country_id, method, currency_id, withdrawal_fee_percent, sending_fee_percent)
SELECT c.id, m.method, c.currency_id, m.withdrawal, m.sending
FROM (VALUES
    ('RUS', 'Sberbank',     1.50, 0.00),
    ('RUS', 'Tinkoff',      1.00, 0.00),
    ('CIV', 'Orange Money', 0.00, 1.00),
    ('CIV', 'Wave',         0.00, 0.00),
    ('CIV', 'MTN Money',    0.00, 1.00),
    ('CMR', 'MTN Money',    0.00, 1.00),
    ('CMR', 'Orange Money', 0.00, 1.00)
) AS m(country, method, withdrawal, sending)
JOIN countries c ON c.code = m.country;

-- Taux (1 devise source = X devise cible) et commission agent
INSERT INTO rates (from_currency_id, to_currency_id, rate, commission_percent)
SELECT f.id, t.id, r.rate, 1.00
FROM (VALUES ('RUB', 'XOF', 7.25), ('RUB', 'XAF', 7.25), ('XOF', 'RUB', 0.13), ('XAF', 'RUB', 0.13)) AS r(f, t, rate)
JOIN currencies f ON f.code = r.f
JOIN currencies t ON t.code = r.t;

-- Back-office
INSERT INTO admins (name, email, password) VALUES
    ('Admin Local', 'admin@movecash.local', '__STAFF_PASSWORD_HASH__');
INSERT INTO semi_admins (name, email, password) VALUES
    ('Semi-admin Local', 'semi@movecash.local', '__STAFF_PASSWORD_HASH__');

INSERT INTO agents (name, email, password, country_id, can_process) VALUES
    ('Ivan (Russie)',            'agent.ru@movecash.local', '__STAFF_PASSWORD_HASH__', (SELECT id FROM countries WHERE code = 'RUS'), true),
    ('Aminata (Côte d''Ivoire)', 'agent.ci@movecash.local', '__STAFF_PASSWORD_HASH__', (SELECT id FROM countries WHERE code = 'CIV'), true);

-- Numéros agréés : là où les clients paient l'agent
INSERT INTO authorized_numbers (agent_id, country_id, payment_method_id, number, label)
SELECT a.id, pm.country_id, pm.id, n.number, n.label
FROM (VALUES
    ('agent.ru@movecash.local', 'RUS', 'Sberbank',     '+7 916 555 12 34', 'Sber Ivan'),
    ('agent.ru@movecash.local', 'RUS', 'Tinkoff',      '+7 916 555 98 76', 'Tinkoff Ivan'),
    ('agent.ci@movecash.local', 'CIV', 'Orange Money', '07 07 00 00 01',   'OM Aminata'),
    ('agent.ci@movecash.local', 'CIV', 'Wave',         '05 05 00 00 02',   'Wave Aminata')
) AS n(email, country, method, number, label)
JOIN agents a ON a.email = n.email
JOIN countries c ON c.code = n.country
JOIN payment_methods pm ON pm.country_id = c.id AND pm.method = n.method;

-- Soldes : de quoi payer les bénéficiaires dans chaque devise
INSERT INTO balances (agent_id, currency_id, amount)
SELECT a.id, cur.id, b.amount
FROM (VALUES
    ('agent.ru@movecash.local', 'RUB',       0),
    ('agent.ru@movecash.local', 'XOF', 5000000),
    ('agent.ru@movecash.local', 'XAF', 5000000),
    ('agent.ci@movecash.local', 'XOF',       0),
    ('agent.ci@movecash.local', 'RUB',  200000)
) AS b(email, currency, amount)
JOIN agents a ON a.email = b.email
JOIN currencies cur ON cur.code = b.currency;
