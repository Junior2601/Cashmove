const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// CREATE ADMIN (protégé)
router.post(
  "/register",
  adminController.createAdmin
);

// GET ALL ADMINS
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  adminController.getAdmins
);

// DELETE
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminController.deleteAdmin
);

module.exports = router;