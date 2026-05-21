const express = require("express");
const router = express.Router();
const semiAdminController = require("../controllers/semiAdmin.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");


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

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.deleteSemiAdmin
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.updateSemiAdmin
);

module.exports = router;