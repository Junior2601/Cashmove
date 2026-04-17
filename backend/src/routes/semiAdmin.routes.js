const express = require("express");
const router = express.Router();

const semiAdminController = require("../controllers/semiAdmin.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// CREATE
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.createSemiAdmin
);

// GET ALL
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.getSemiAdmins
);

// DELETE
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  semiAdminController.deleteSemiAdmin
);

module.exports = router;