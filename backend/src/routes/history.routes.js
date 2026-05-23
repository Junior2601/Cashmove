// routes/history.routes.js
const router = require("express").Router();

const controller = require("../controllers/history.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// GET ALL (admin seulement) - sans pagination
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  controller.getHistory
);

// GET avec pagination et filtres (admin seulement)
router.get(
  "/paginated",
  verifyToken,
  authorizeRoles("admin"),
  controller.getHistoryPaginated
);

// GET BY ENTITY (admin + semi-admin)
router.get(
  "/entity/:type/:id",
  verifyToken,
  authorizeRoles("admin", "semi-admin"),
  controller.getByEntity
);

// GET BY ACTOR (admin seulement)
router.get(
  "/actor/:actor_type/:actor_id",
  verifyToken,
  authorizeRoles("admin"),
  controller.getByActor
);

module.exports = router;