const express = require("express");
const router = express.Router();
const semiAdminController = require("../controllers/semiAdmin.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// --- Routes publiques ---
router.post("/login", semiAdminController.loginSemiAdmin);

// --- Routes protégées (admin uniquement) ---
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.createSemiAdmin
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.getSemiAdmins
);

router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.updateSemiAdminStatus
);

router.get(
  "/stats",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.getStatistics
);

module.exports = router;