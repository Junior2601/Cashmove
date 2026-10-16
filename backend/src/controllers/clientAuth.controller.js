// controllers/clientAuth.controller.js
const service = require("../services/clientAuth.service");

// Jeton de rafraîchissement en cookie HttpOnly (cahier V2 · §11)
const REFRESH_COOKIE = "mc_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const readRefreshCookie = (req) => {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === REFRESH_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
};

const clientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || null;

const handleError = (res, err) => {
  if (err instanceof service.AuthError) {
    const { status, code, message, ...extra } = err;
    return res.status(status).json({ success: false, code, message, ...extra });
  }
  console.error("❌ clientAuth:", err);
  return res.status(500).json({ success: false, message: "Erreur serveur" });
};

// POST /api/auth/email/request  { email, language? }
const requestCode = async (req, res) => {
  try {
    const data = await service.requestCode(req.body, clientIp(req));
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
};

// POST /api/auth/email/verify
//   { email, code }                                            → connexion
//   { email, code, first_name, last_name, country_id, phone? } → inscription
const verifyCode = async (req, res) => {
  try {
    const { refresh_token, ...data } = await service.verifyCode(req.body, req.headers["user-agent"]);
    res.cookie(REFRESH_COOKIE, refresh_token, COOKIE_OPTIONS);
    res.status(data.created ? 201 : 200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
};

// POST /api/auth/refresh  (cookie mc_refresh)
const refresh = async (req, res) => {
  try {
    const { refresh_token, ...data } = await service.refreshSession(
      readRefreshCookie(req),
      req.headers["user-agent"]
    );
    res.cookie(REFRESH_COOKIE, refresh_token, COOKIE_OPTIONS);
    res.json({ success: true, data });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTIONS.path });
    handleError(res, err);
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await service.logout(readRefreshCookie(req));
  } catch (err) {
    console.error("❌ logout:", err.message);
  }
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTIONS.path });
  res.json({ success: true });
};

module.exports = { requestCode, verifyCode, refresh, logout, handleError };
