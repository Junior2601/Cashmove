// services/clientAuth.service.js
// Connexion client par e-mail + code à 6 chiffres envoyé via Resend
// (cahier V2 · CPT-01, CPT-02, CPT-03 — l'e-mail remplace le SMS)

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const Client = require("../models/client.model");
const History = require("../models/history.model");
const { sendEmailOrThrow } = require("../utils/email");
const { loginCodeTemplate } = require("../templates/emailTemplates");
const { toE164 } = require("../utils/phone");

const CODE_MAX_ATTEMPTS = 5;         // essais par code
const CODE_RESEND_DELAY_S = 60;      // délai minimum entre deux envois
const CODE_MAX_PER_HOUR = 5;         // envois max par adresse et par heure
const CODE_TTL_S = 600;              // 10 minutes (un e-mail peut arriver avec du retard)
const ACCESS_TOKEN_TTL = "15m";

// Erreur métier avec code HTTP, lue par le contrôleur
class AuthError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

const hmac = (value) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(value).digest("hex");

const hashCode = (email, code) => hmac(`login:${email}:${code}`);
const hashRefreshToken = (token) => hmac(`refresh:${token}`);

const signAccessToken = (clientId) =>
  jwt.sign({ id: clientId, role: "client" }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const normalizeEmail = (raw) => {
  const email = String(raw || "").trim().toLowerCase();
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new AuthError(400, "INVALID_EMAIL", "Adresse e-mail invalide");
  }
  return email;
};

// "awa.ngono@gmail.com" → "aw••••••@gmail.com"
const maskEmail = (email) => {
  const [user, domain] = email.split("@");
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"•".repeat(Math.max(user.length - visible.length, 1))}@${domain}`;
};

// ─── 1. Demande de code ──────────────────────────────────────────────────────

const requestCode = async ({ email: rawEmail, language }, ip) => {
  const email = normalizeEmail(rawEmail);

  const stats = await Client.codeStats(email, 60);
  if (stats.count > 0 && stats.seconds_since_last < CODE_RESEND_DELAY_S) {
    throw new AuthError(429, "CODE_TOO_SOON", "Patientez avant de redemander un code", {
      retry_after: CODE_RESEND_DELAY_S - stats.seconds_since_last,
    });
  }
  if (stats.count >= CODE_MAX_PER_HOUR) {
    throw new AuthError(429, "CODE_TOO_MANY", "Trop de codes demandés, réessayez dans une heure");
  }

  const existing = await Client.findByEmail(email);
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const codeId = await Client.createCode(email, hashCode(email, code), ip);

  const lang = existing?.language || (language === "en" ? "en" : "fr");
  try {
    await sendEmailOrThrow({
      to: email,
      subject: lang === "en" ? `${code} is your MoveCash code` : `${code} est votre code MoveCash`,
      html: loginCodeTemplate({ code, first_name: existing?.first_name, is_new: !existing, language: lang }),
    });
  } catch (err) {
    console.error("❌ Envoi du code de connexion:", err.message);
    // En développement, le code reste utilisable via les logs du serveur
    if (process.env.NODE_ENV === "production") {
      await Client.consumeCode(codeId);
      throw new AuthError(502, "EMAIL_FAILED", "Impossible d'envoyer l'e-mail, réessayez dans un instant");
    }
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`📧 [CODE DEV] ${email} → ${code}`);
  }

  return {
    email_masked: maskEmail(email),
    is_new: !existing,          // le front affiche alors le formulaire d'inscription
    expires_in: CODE_TTL_S,
    resend_in: CODE_RESEND_DELAY_S,
  };
};

// ─── 2. Vérification du code (crée le compte si besoin) ──────────────────────

// Inscription : pays obligatoire, téléphone facultatif (non vérifié, sert au pré-remplissage)
const validateRegistration = async ({ first_name, last_name, country_id, phone }) => {
  if (!first_name?.trim() || !last_name?.trim() || !country_id) {
    throw new AuthError(400, "REGISTRATION_REQUIRED", "Nom, prénom et pays requis pour créer le compte");
  }
  const { rows } = await db.query(
    `SELECT phone_prefix FROM countries WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
    [country_id]
  );
  if (!rows[0]) throw new AuthError(400, "INVALID_COUNTRY", "Pays invalide");

  let e164 = null;
  if (phone && String(phone).trim()) {
    e164 = toE164(rows[0].phone_prefix, phone);
    if (!e164) throw new AuthError(400, "INVALID_PHONE", "Numéro de téléphone invalide");
  }
  return {
    first_name: first_name.trim().slice(0, 100),
    last_name: last_name.trim().slice(0, 100),
    country_id: parseInt(country_id),
    phone: e164,
  };
};

const verifyCode = async (body, device) => {
  const email = normalizeEmail(body.email);

  const row = await Client.findActiveCode(email);
  if (!row) {
    throw new AuthError(400, "CODE_EXPIRED", "Code expiré, demandez-en un nouveau");
  }
  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    throw new AuthError(429, "CODE_LOCKED", "Trop d'essais, demandez un nouveau code");
  }

  const given = Buffer.from(hashCode(email, String(body.code || "").trim()));
  const expected = Buffer.from(row.code_hash);
  const valid = given.length === expected.length && crypto.timingSafeEqual(given, expected);

  if (!valid) {
    const attempts = await Client.incrementCodeAttempts(row.id);
    if (attempts >= CODE_MAX_ATTEMPTS) await Client.consumeCode(row.id);
    throw new AuthError(400, "CODE_INVALID", "Code incorrect", {
      attempts_left: Math.max(CODE_MAX_ATTEMPTS - attempts, 0),
    });
  }

  let account = await Client.findByEmail(email);
  let created = false;

  if (!account) {
    // Le code reste valable tant que le formulaire d'inscription est incomplet
    const data = await validateRegistration(body);
    account = await Client.create({
      ...data,
      email,
      language: body.language === "en" ? "en" : "fr",
    });
    created = true;
  } else if (!account.is_active) {
    throw new AuthError(403, "ACCOUNT_DISABLED", "Compte désactivé, contactez le support");
  }

  await Client.consumeCode(row.id);
  await Client.touchLogin(account.id);
  await Client.resetPinFailures(account.id);

  await History.create({
    action_type: created ? "client_registered" : "client_login",
    actor_type: "client",
    actor_id: account.id,
    entity_type: "client",
    entity_id: account.id,
    description: created ? "Création de compte client" : "Connexion client",
    metadata: null,
  }).catch((e) => console.error("History (non-bloquant):", e.message));

  const session = await issueSession(account.id, device);
  return { ...session, created, client: await Client.findPublicById(account.id) };
};

// ─── 3. Session : jeton d'accès 15 min + jeton de rafraîchissement 30 j ──────

const issueSession = async (clientId, device) => {
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await Client.createRefreshToken(clientId, hashRefreshToken(refreshToken), device);
  return { access_token: signAccessToken(clientId), refresh_token: refreshToken };
};

// Rotation : l'ancien jeton est révoqué, un nouveau est émis
const refreshSession = async (refreshToken, device) => {
  if (!refreshToken) throw new AuthError(401, "NO_REFRESH_TOKEN", "Session expirée");

  const hash = hashRefreshToken(refreshToken);
  const row = await Client.findValidRefreshToken(hash);
  if (!row) throw new AuthError(401, "INVALID_REFRESH_TOKEN", "Session expirée");

  await Client.revokeRefreshToken(hash);
  const session = await issueSession(row.client_id, device);
  return { ...session, client: await Client.findPublicById(row.client_id) };
};

const logout = async (refreshToken) => {
  if (refreshToken) await Client.revokeRefreshToken(hashRefreshToken(refreshToken));
};

// ─── 4. Code PIN (CPT-03) ────────────────────────────────────────────────────

const setPin = async (clientId, pin) => {
  if (pin === null) return Client.setPinHash(clientId, null);   // désactivation
  if (!/^\d{4}$/.test(String(pin))) {
    throw new AuthError(400, "INVALID_PIN", "Le code PIN doit contenir 4 chiffres");
  }
  await Client.setPinHash(clientId, await bcrypt.hash(String(pin), 10));
};

const PIN_MAX_ATTEMPTS = 5;

/**
 * Vérifie le PIN et compte les échecs (tous appareils confondus).
 * Au 5e échec : toutes les sessions sont fermées, reconnexion par e-mail obligatoire.
 * Retourne { valid, attempts_left }.
 */
const verifyPin = async (clientId, pin) => {
  const hash = await Client.findPinHash(clientId);
  if (!hash) return { valid: true, attempts_left: PIN_MAX_ATTEMPTS };   // pas de PIN configuré

  if (await bcrypt.compare(String(pin || ""), hash)) {
    await Client.resetPinFailures(clientId);
    return { valid: true, attempts_left: PIN_MAX_ATTEMPTS };
  }

  const failures = await Client.incrementPinFailures(clientId);
  if (failures >= PIN_MAX_ATTEMPTS) {
    await Client.revokeAllRefreshTokens(clientId);
    await Client.resetPinFailures(clientId);
    await History.create({
      action_type: "client_pin_locked",
      actor_type: "client",
      actor_id: clientId,
      entity_type: "client",
      entity_id: clientId,
      description: `${PIN_MAX_ATTEMPTS} codes PIN erronés : sessions fermées`,
      metadata: null,
    }).catch((e) => console.error("History (non-bloquant):", e.message));
    throw new AuthError(423, "PIN_LOCKED", "Trop d'essais. Par sécurité, reconnectez-vous avec votre e-mail.");
  }
  return { valid: false, attempts_left: PIN_MAX_ATTEMPTS - failures };
};

// « Code PIN oublié » : le PIN est supprimé et toutes les sessions fermées.
// Le client se reconnecte par e-mail (preuve d'identité), puis crée un nouveau PIN.
const forgotPin = async (clientId) => {
  await Client.setPinHash(clientId, null);
  await Client.revokeAllRefreshTokens(clientId);
  await History.create({
    action_type: "client_pin_forgotten",
    actor_type: "client",
    actor_id: clientId,
    entity_type: "client",
    entity_id: clientId,
    description: "Code PIN oublié : PIN supprimé, sessions fermées",
    metadata: null,
  }).catch((e) => console.error("History (non-bloquant):", e.message));
};

module.exports = {
  AuthError,
  requestCode,
  verifyCode,
  refreshSession,
  logout,
  setPin,
  verifyPin,
  forgotPin,
};
