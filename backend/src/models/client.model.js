// models/client.model.js
const db = require("../config/db");
const { maskPhone } = require("../utils/phone");

const PUBLIC_FIELDS = `
  c.id, c.phone, c.country_id, c.first_name, c.last_name, c.email,
  (c.pin_hash IS NOT NULL) AS has_pin,
  c.language, c.display_currency_id,
  c.push_enabled, c.sound_enabled, c.announcements_enabled,
  c.created_at,
  co.name         AS country_name,
  co.code         AS country_code,
  co.phone_prefix AS phone_prefix,
  cur.code        AS display_currency_code
`;

const Client = {
  // ─── Clients ───────────────────────────────────────────────────────────────

  findByEmail: async (email, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT * FROM clients WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return rows[0] || null;
  },

  findPublicById: async (id, client = null) => {
    const { rows } = await (client || db).query(
      `SELECT ${PUBLIC_FIELDS}
       FROM clients c
       JOIN countries co ON co.id = c.country_id
       LEFT JOIN currencies cur ON cur.id = c.display_currency_id
       WHERE c.id = $1 AND c.deleted_at IS NULL AND c.is_active = true`,
      [id]
    );
    const row = rows[0];
    return row ? { ...row, phone_masked: maskPhone(row.phone, row.phone_prefix) } : null;
  },

  findPinHash: async (id) => {
    const { rows } = await db.query(
      `SELECT pin_hash FROM clients WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return rows[0]?.pin_hash || null;
  },

  create: async (data, client = null) => {
    const { rows } = await (client || db).query(
      `INSERT INTO clients (email, phone, country_id, first_name, last_name, language)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [data.email, data.phone || null, data.country_id, data.first_name, data.last_name, data.language || "fr"]
    );
    return rows[0];
  },

  // Mise à jour partielle : seuls les champs autorisés et présents sont modifiés
  update: async (id, data) => {
    const allowed = [
      "first_name", "last_name", "phone", "country_id", "language", "display_currency_id",
      "push_enabled", "sound_enabled", "announcements_enabled",
    ];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        sets.push(`${key} = $${values.length}`);
      }
    }
    if (sets.length === 0) return Client.findPublicById(id);

    values.push(id);
    await db.query(
      `UPDATE clients SET ${sets.join(", ")} WHERE id = $${values.length} AND deleted_at IS NULL`,
      values
    );
    return Client.findPublicById(id);
  },

  setPinHash: async (id, pinHash) => {
    await db.query(`UPDATE clients SET pin_hash = $1, pin_failed_attempts = 0 WHERE id = $2`, [pinHash, id]);
  },

  // Échecs de PIN comptés côté serveur (migration 003)
  incrementPinFailures: async (id) => {
    const { rows } = await db.query(
      `UPDATE clients SET pin_failed_attempts = pin_failed_attempts + 1 WHERE id = $1 RETURNING pin_failed_attempts`,
      [id]
    );
    return rows[0]?.pin_failed_attempts ?? 0;
  },

  resetPinFailures: async (id) => {
    await db.query(`UPDATE clients SET pin_failed_attempts = 0 WHERE id = $1 AND pin_failed_attempts <> 0`, [id]);
  },

  // Ferme toutes les sessions du client (tous ses appareils)
  revokeAllRefreshTokens: async (id) => {
    await db.query(
      `UPDATE client_refresh_tokens SET revoked_at = NOW() WHERE client_id = $1 AND revoked_at IS NULL`,
      [id]
    );
  },

  touchLogin: async (id, client = null) => {
    await (client || db).query(`UPDATE clients SET last_login_at = NOW() WHERE id = $1`, [id]);
  },

  // CPT-05 : suppression = anonymisation (les transactions restent pour la compta)
  softDelete: async (id) => {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE clients
         SET deleted_at = NOW(), is_active = false,
             email = 'supprime-' || id || '@movecash.invalid', phone = NULL,
             first_name = 'Supprimé', last_name = '', pin_hash = NULL
         WHERE id = $1`,
        [id]
      );
      await client.query(`UPDATE client_payment_accounts SET deleted_at = NOW() WHERE client_id = $1 AND deleted_at IS NULL`, [id]);
      await client.query(`UPDATE beneficiaries SET deleted_at = NOW() WHERE client_id = $1 AND deleted_at IS NULL`, [id]);
      await client.query(`UPDATE client_refresh_tokens SET revoked_at = NOW() WHERE client_id = $1 AND revoked_at IS NULL`, [id]);
      await client.query(`DELETE FROM push_subscriptions WHERE client_id = $1`, [id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── Codes de connexion par e-mail ───────────────────────────────────────────────────────────────────

  // Nombre de codes envoyés à cette adresse depuis `minutes` minutes, et le dernier envoi
  codeStats: async (email, minutes) => {
    const { rows } = await db.query(
      `SELECT COUNT(*)::INT AS count, MAX(created_at) AS last_sent_at,
              EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))::INT AS seconds_since_last
       FROM client_login_codes
       WHERE email = $1 AND created_at > NOW() - ($2 || ' minutes')::INTERVAL`,
      [email, String(minutes)]
    );
    return rows[0];
  },

  createCode: async (email, codeHash, ip) => {
    // Un nouveau code invalide les précédents
    await db.query(
      `UPDATE client_login_codes SET consumed_at = NOW() WHERE email = $1 AND consumed_at IS NULL`,
      [email]
    );
    const { rows } = await db.query(
      `INSERT INTO client_login_codes (email, code_hash, ip, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
       RETURNING id`,
      [email, codeHash, ip || null]
    );
    return rows[0].id;
  },

  findActiveCode: async (email) => {
    const { rows } = await db.query(
      `SELECT * FROM client_login_codes
       WHERE email = $1 AND consumed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  incrementCodeAttempts: async (codeId) => {
    const { rows } = await db.query(
      `UPDATE client_login_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
      [codeId]
    );
    return rows[0]?.attempts ?? 0;
  },

  consumeCode: async (codeId) => {
    await db.query(`UPDATE client_login_codes SET consumed_at = NOW() WHERE id = $1`, [codeId]);
  },

  // ─── Jetons de rafraîchissement ────────────────────────────────────────────

  createRefreshToken: async (clientId, tokenHash, device) => {
    await db.query(
      `INSERT INTO client_refresh_tokens (client_id, token_hash, device, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
      [clientId, tokenHash, device ? String(device).slice(0, 255) : null]
    );
  },

  findValidRefreshToken: async (tokenHash) => {
    const { rows } = await db.query(
      `SELECT rt.*
       FROM client_refresh_tokens rt
       JOIN clients c ON c.id = rt.client_id AND c.deleted_at IS NULL AND c.is_active = true
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  revokeRefreshToken: async (tokenHash) => {
    await db.query(
      `UPDATE client_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );
  },
};

module.exports = Client;
