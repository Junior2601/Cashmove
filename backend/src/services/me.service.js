// services/me.service.js
// Espace client connecté (cahier V2 · CPT-04/05, NUM-01..04, TRX-03..05)

const db = require("../config/db");
const Client = require("../models/client.model");
const ClientBook = require("../models/clientBook.model");
const { AuthError, setPin, verifyPin, forgotPin } = require("./clientAuth.service");
const { toE164, maskPhone } = require("../utils/phone");

const Accounts = ClientBook("accounts");
const Beneficiaries = ClientBook("beneficiaries");
const MAX_BOOK_ENTRIES = 50;

const withMask = (entry) => entry && { ...entry, phone_masked: maskPhone(entry.phone, entry.phone_prefix) };

// ─── Profil (CPT-04) ─────────────────────────────────────────────────────────

const getProfile = async (clientId) => {
  const profile = await Client.findPublicById(clientId);
  if (!profile) throw new AuthError(404, "CLIENT_NOT_FOUND", "Compte introuvable");
  return profile;
};

const updateProfile = async (clientId, body) => {
  const data = {};
  if (body.first_name !== undefined) {
    if (!String(body.first_name).trim()) throw new AuthError(400, "INVALID_NAME", "Prénom requis");
    data.first_name = String(body.first_name).trim().slice(0, 100);
  }
  if (body.last_name !== undefined) {
    if (!String(body.last_name).trim()) throw new AuthError(400, "INVALID_NAME", "Nom requis");
    data.last_name = String(body.last_name).trim().slice(0, 100);
  }
  // L'e-mail est l'identifiant de connexion : il n'est pas modifiable ici.
  // Pays et téléphone (non vérifié, sert à pré-remplir les envois) le sont.
  if (body.country_id !== undefined || body.phone !== undefined) {
    const current = await Client.findPublicById(clientId);
    const countryId = body.country_id !== undefined ? parseInt(body.country_id) : current.country_id;
    const { rows } = await db.query(
      `SELECT phone_prefix FROM countries WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
      [countryId]
    );
    if (!rows[0]) throw new AuthError(400, "INVALID_COUNTRY", "Pays invalide");
    data.country_id = countryId;
    if (body.phone !== undefined) {
      data.phone = body.phone ? toE164(rows[0].phone_prefix, body.phone) : null;
      if (body.phone && !data.phone) throw new AuthError(400, "INVALID_PHONE", "Numéro de téléphone invalide");
    }
  }
  if (body.language !== undefined) {
    if (!["fr", "en"].includes(body.language)) throw new AuthError(400, "INVALID_LANGUAGE", "Langue invalide");
    data.language = body.language;
  }
  if (body.display_currency_id !== undefined) {
    data.display_currency_id = body.display_currency_id ? parseInt(body.display_currency_id) : null;
  }
  for (const key of ["push_enabled", "sound_enabled", "announcements_enabled"]) {
    if (body[key] !== undefined) data[key] = !!body[key];
  }

  await Client.update(clientId, data);
  return getProfile(clientId);
};

// ─── PIN (CPT-03) ────────────────────────────────────────────────────────────

const changePin = async (clientId, { pin, current_pin }) => {
  const check = await verifyPin(clientId, current_pin);
  if (!check.valid) {
    throw new AuthError(403, "PIN_INVALID", "Code PIN actuel incorrect", { attempts_left: check.attempts_left });
  }
  await setPin(clientId, pin === null ? null : pin);
};

// Déverrouillage de l'app (écran PIN à l'ouverture)
const checkPin = async (clientId, pin) => verifyPin(clientId, pin);

// ─── Suppression et export (CPT-05) ──────────────────────────────────────────

const deleteAccount = async (clientId) => {
  await Client.softDelete(clientId);
};

const exportData = async (clientId) => {
  const [profile, accounts, beneficiaries, transactions, notifications] = await Promise.all([
    getProfile(clientId),
    Accounts.findAll(clientId),
    Beneficiaries.findAll(clientId),
    db.query(`SELECT * FROM transactions WHERE client_id = $1 ORDER BY created_at DESC`, [clientId]),
    db.query(`SELECT * FROM notifications WHERE client_id = $1 ORDER BY created_at DESC`, [clientId]),
  ]);
  return {
    exported_at: new Date().toISOString(),
    profile,
    payment_accounts: accounts,
    beneficiaries,
    transactions: transactions.rows,
    notifications: notifications.rows,
  };
};

// ─── Carnets (NUM-01..04) ────────────────────────────────────────────────────

// Vérifie pays + moyen de paiement + numéro, et renvoie les valeurs normalisées
const validateBookEntry = async (body, { partial = false, nameRequired = false } = {}) => {
  const out = {};

  const name = body.name ?? body.label;
  if (name !== undefined) {
    out.name = name ? String(name).trim().slice(0, nameRequired ? 100 : 50) || null : null;
  }
  if (nameRequired && !partial && !out.name) {
    throw new AuthError(400, "INVALID_NAME", "Le nom du bénéficiaire est requis");
  }

  const touchesNumber = ["country_id", "payment_method_id", "phone"].some((k) => body[k] !== undefined);
  if (!partial || touchesNumber) {
    if (!body.country_id || !body.payment_method_id || !body.phone) {
      throw new AuthError(400, "MISSING_FIELDS", "Pays, moyen de paiement et numéro sont requis");
    }
    const { rows } = await db.query(
      `SELECT co.phone_prefix
       FROM payment_methods pm
       JOIN countries co ON co.id = pm.country_id
       WHERE pm.id = $1 AND pm.country_id = $2
         AND pm.is_active = true AND pm.deleted_at IS NULL
         AND co.is_active = true AND co.deleted_at IS NULL`,
      [body.payment_method_id, body.country_id]
    );
    if (!rows[0]) {
      throw new AuthError(400, "INVALID_METHOD", "Ce moyen de paiement n'est pas disponible dans ce pays");
    }
    const phone = toE164(rows[0].phone_prefix, body.phone);
    if (!phone) throw new AuthError(400, "INVALID_PHONE", "Numéro de téléphone invalide pour ce pays");

    out.country_id = parseInt(body.country_id);
    out.payment_method_id = parseInt(body.payment_method_id);
    out.phone = phone;
  }

  return out;
};

const isUniqueViolation = (err) => err.code === "23505";

const makeBookService = (Book, { flagKey, nameRequired, label }) => ({
  list: async (clientId) => (await Book.findAll(clientId)).map(withMask),

  get: async (clientId, id) => {
    const entry = await Book.findById(clientId, id);
    if (!entry) throw new AuthError(404, "NOT_FOUND", `${label} introuvable`);
    return withMask(entry);
  },

  create: async (clientId, body) => {
    if ((await Book.count(clientId)) >= MAX_BOOK_ENTRIES) {
      throw new AuthError(400, "BOOK_FULL", `Maximum ${MAX_BOOK_ENTRIES} entrées`);
    }
    const data = await validateBookEntry(body, { nameRequired });
    data.flag = body[flagKey] === true;
    // Le premier numéro d'envoi devient le numéro par défaut
    if (flagKey === "is_default" && (await Book.count(clientId)) === 0) data.flag = true;
    try {
      return withMask(await Book.create(clientId, data));
    } catch (err) {
      if (isUniqueViolation(err)) throw new AuthError(409, "ALREADY_EXISTS", `${label} déjà enregistré`);
      throw err;
    }
  },

  update: async (clientId, id, body) => {
    const existing = await Book.findById(clientId, id);
    if (!existing) throw new AuthError(404, "NOT_FOUND", `${label} introuvable`);

    // Si un seul champ du numéro change, on complète avec l'existant pour revalider
    const merged = { ...body };
    if (["country_id", "payment_method_id", "phone"].some((k) => body[k] !== undefined)) {
      merged.country_id ??= existing.country_id;
      merged.payment_method_id ??= existing.payment_method_id;
      merged.phone ??= existing.phone;
    }
    const data = await validateBookEntry(merged, { partial: true, nameRequired });
    if (body[flagKey] !== undefined) data.flag = !!body[flagKey];
    if (flagKey === "is_default" && data.flag === false && existing.is_default) {
      throw new AuthError(400, "DEFAULT_REQUIRED", "Choisissez un autre numéro par défaut à la place");
    }
    try {
      return withMask(await Book.update(clientId, id, data));
    } catch (err) {
      if (isUniqueViolation(err)) throw new AuthError(409, "ALREADY_EXISTS", `${label} déjà enregistré`);
      throw err;
    }
  },

  remove: async (clientId, id) => {
    const existing = await Book.findById(clientId, id);
    if (!existing) throw new AuthError(404, "NOT_FOUND", `${label} introuvable`);
    await Book.remove(clientId, id);

    // Le numéro par défaut supprimé est remplacé par le plus ancien restant
    if (flagKey === "is_default" && existing.is_default) {
      await db.query(
        `UPDATE client_payment_accounts SET is_default = true
         WHERE id = (SELECT id FROM client_payment_accounts
                     WHERE client_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at ASC LIMIT 1)`,
        [clientId]
      );
    }
  },
});

const accounts = makeBookService(Accounts, {
  flagKey: "is_default", nameRequired: false, label: "Numéro",
});
const beneficiaries = makeBookService(Beneficiaries, {
  flagKey: "is_favorite", nameRequired: true, label: "Bénéficiaire",
});

// ─── Transactions (TRX-03, TRX-04, TRX-05) ───────────────────────────────────

const TX_SELECT = `
  SELECT v.*,
         t.from_country_id, t.to_country_id,
         t.sender_method_id, t.receiver_method_id,
         b.id   AS beneficiary_id,
         b.name AS beneficiary_name
  FROM transactions t
  JOIN v_transaction_details v ON v.id = t.id
  LEFT JOIN beneficiaries b
         ON b.client_id = t.client_id
        AND b.payment_method_id = t.receiver_method_id
        AND b.phone = t.receiver_phone
        AND b.deleted_at IS NULL
`;

const STATUSES = ["en_attente", "validee", "effectuee", "echouee", "expiree", "annulee"];

const listTransactions = async (clientId, query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);

  const where = ["t.client_id = $1"];
  const values = [clientId];

  if (query.status) {
    const statuses = String(query.status).split(",").filter((s) => STATUSES.includes(s));
    if (statuses.length) {
      values.push(statuses);
      where.push(`t.status = ANY($${values.length})`);
    }
  }
  if (query.from && !isNaN(Date.parse(query.from))) {
    values.push(query.from);
    where.push(`t.created_at >= $${values.length}::DATE`);
  }
  if (query.to && !isNaN(Date.parse(query.to))) {
    values.push(query.to);
    where.push(`t.created_at < $${values.length}::DATE + 1`);
  }
  if (query.q && String(query.q).trim()) {
    values.push(`%${String(query.q).trim()}%`);
    const p = `$${values.length}`;
    where.push(`(t.tracking_code ILIKE ${p} OR t.receiver_phone ILIKE ${p} OR b.name ILIKE ${p})`);
  }

  const whereSql = where.join(" AND ");
  const countRes = await db.query(
    `SELECT COUNT(*)::INT AS total
     FROM transactions t
     LEFT JOIN beneficiaries b
            ON b.client_id = t.client_id AND b.payment_method_id = t.receiver_method_id
           AND b.phone = t.receiver_phone AND b.deleted_at IS NULL
     WHERE ${whereSql}`,
    values
  );

  values.push(limit, (page - 1) * limit);
  const { rows } = await db.query(
    `${TX_SELECT}
     WHERE ${whereSql}
     ORDER BY t.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  const total = countRes.rows[0].total;
  return {
    items: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const getTransaction = async (clientId, ref) => {
  const isId = /^\d+$/.test(String(ref));
  const { rows } = await db.query(
    `${TX_SELECT}
     WHERE t.client_id = $1 AND ${isId ? "t.id = $2" : "t.tracking_code = $2"}`,
    [clientId, isId ? parseInt(ref) : String(ref)]
  );
  const tx = rows[0];
  if (!tx) throw new AuthError(404, "NOT_FOUND", "Transaction introuvable");

  const events = await db.query(
    `SELECT from_status, to_status, note, created_at
     FROM transaction_events
     WHERE transaction_id = $1
     ORDER BY created_at ASC, id ASC`,
    [tx.id]
  );
  return { ...tx, events: events.rows };
};

// ─── Notifications (NOT-03) ──────────────────────────────────────────────────

const listNotifications = async (clientId, query) => {
  const limit = Math.min(Math.max(parseInt(query.limit) || 30, 1), 100);
  const values = [clientId];
  let since = "";
  // Rattrapage après reconnexion : notifications reçues depuis un horodatage
  if (query.since && !isNaN(Date.parse(query.since))) {
    values.push(query.since);
    since = `AND created_at > $${values.length}::TIMESTAMP`;
  }
  values.push(limit);
  const [items, unread] = await Promise.all([
    db.query(
      `SELECT id, type, title, body, link, data, read_at, created_at
       FROM notifications
       WHERE client_id = $1 ${since}
       ORDER BY created_at DESC
       LIMIT $${values.length}`,
      values
    ),
    db.query(
      `SELECT COUNT(*)::INT AS n FROM notifications WHERE client_id = $1 AND read_at IS NULL`,
      [clientId]
    ),
  ]);
  return { items: items.rows, unread_count: unread.rows[0].n };
};

const markNotificationsRead = async (clientId, id = null) => {
  await db.query(
    `UPDATE notifications SET read_at = NOW()
     WHERE client_id = $1 AND read_at IS NULL ${id ? "AND id = $2" : ""}`,
    id ? [clientId, parseInt(id)] : [clientId]
  );
  const { rows } = await db.query(
    `SELECT COUNT(*)::INT AS n FROM notifications WHERE client_id = $1 AND read_at IS NULL`,
    [clientId]
  );
  return { unread_count: rows[0].n };
};

module.exports = {
  listNotifications,
  markNotificationsRead,
  getProfile,
  updateProfile,
  changePin,
  checkPin,
  forgotPin,
  deleteAccount,
  exportData,
  accounts,
  beneficiaries,
  listTransactions,
  getTransaction,
  Beneficiaries,
};
