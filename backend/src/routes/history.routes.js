const router = require("express").Router();

const controller = require("../controllers/history.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// GET ALL (admin seulement)
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  controller.getHistory
);

// GET BY ENTITY
router.get(
  "/entity/:type/:id",
  verifyToken,
  authorizeRoles("admin", "semi-admin"),
  controller.getByEntity
);

// GET BY ACTOR
router.get(
  "/actor/:actor_type/:actor_id",
  verifyToken,
  authorizeRoles("admin"),
  controller.getByActor
);

module.exports = router;