// routes/announcement.routes.js — annonces aux clients, immédiates ou programmées (admin)
const router = require("express").Router();
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");
const Announcements = require("../services/announcement.service");

const handle = (fn, status = 200) => async (req, res) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (err) {
    if (err instanceof Announcements.AnnouncementError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error("❌ announcement:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

router.use(verifyToken, authorizeRoles("admin"));

// GET /api/announcements?status=scheduled,failed
router.get("/", handle((req) => Announcements.list(req.query)));

// POST /api/announcements  { title, body?, link?, scheduled_at? (ISO) } — sans date : envoi immédiat
router.post("/", handle((req) => Announcements.create(req.user.id, req.body), 201));

// PATCH /api/announcements/:id — modification d'une annonce programmée
router.patch("/:id", handle((req) => Announcements.update(req.user.id, Number(req.params.id), req.body)));

// POST /api/announcements/:id/send-now
router.post("/:id/send-now", handle((req) => Announcements.sendNow(req.user.id, Number(req.params.id))));

// DELETE /api/announcements/:id — annulation (l'annonce reste dans l'historique)
router.delete("/:id", handle((req) => Announcements.cancel(req.user.id, Number(req.params.id))));

module.exports = router;
