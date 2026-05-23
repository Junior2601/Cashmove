const router = require("express").Router();

const controller = require("../controllers/redirection.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// créer redirection
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "semi-admin", "agent"),
  controller.createRedirection
);

// mes redirections (agent connecté)
router.get(
  "/mine",
  verifyToken,
  authorizeRoles("agent"),
  controller.getMyRedirections
);

// accepter
router.put(
  "/:id/accept",
  verifyToken,
  authorizeRoles("agent", "admin", "semi-admin"),
  controller.acceptRedirection
);

// refuser
router.put(
  "/:id/reject",
  verifyToken,
  authorizeRoles("agent"),
  controller.rejectRedirection
);

module.exports = router;