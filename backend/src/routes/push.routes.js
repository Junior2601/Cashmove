// routes/push.routes.js — abonnement Web Push de l'appareil (cahier V2 · NOT-02)
const router = require("express").Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const push = require("../services/push.service");

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json({ success: true, data });
  } catch (err) {
    if (!err.status) console.error("❌ push route:", err);
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : "Erreur serveur" });
  }
};

// Clé publique VAPID (nécessaire au navigateur pour s'abonner)
router.get("/public-key", (req, res) => {
  const key = push.publicKey();
  if (!key) return res.status(503).json({ success: false, message: "Notifications push indisponibles" });
  res.json({ success: true, data: { public_key: key } });
});

// POST /api/push/subscribe  { endpoint, keys: { p256dh, auth }, device? }
router.post(
  "/subscribe",
  verifyToken,
  authorizeRoles("client"),
  handle((req) => push.subscribe(req.user.id, { ...req.body, device: req.body.device || req.headers["user-agent"] }))
);

// DELETE /api/push/subscribe  { endpoint } — désactivation sur cet appareil
router.delete(
  "/subscribe",
  verifyToken,
  authorizeRoles("client"),
  handle((req) => push.unsubscribe(req.user.id, req.body?.endpoint))
);

// ─── Personnel : admins, semi-admins, agents (remplace les e-mails) ─────────
const staffOnly = [verifyToken, authorizeRoles("admin", "semi-admin", "agent")];

// POST /api/push/staff/subscribe  { endpoint, keys: { p256dh, auth }, device? }
router.post(
  "/staff/subscribe",
  ...staffOnly,
  handle((req) =>
    push.subscribeStaff(req.user.role, req.user.id, { ...req.body, device: req.body.device || req.headers["user-agent"] })
  )
);

// DELETE /api/push/staff/subscribe  { endpoint } — désactivation sur cet appareil ou déconnexion
router.delete(
  "/staff/subscribe",
  ...staffOnly,
  handle((req) => push.unsubscribeStaff(req.user.role, req.user.id, req.body?.endpoint))
);

// POST /api/push/staff/status  { endpoint } → { subscribed } pour cet appareil et ce compte
router.post(
  "/staff/status",
  ...staffOnly,
  handle(async (req) => ({ subscribed: await push.isStaffSubscribed(req.user.role, req.user.id, req.body?.endpoint) }))
);

module.exports = router;
