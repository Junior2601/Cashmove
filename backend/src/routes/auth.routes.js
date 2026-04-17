const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// Routes de login séparées par rôle
router.post("/login/admin", authController.loginAdmin);
router.post("/login/semi-admin", authController.loginSemiAdmin);
router.post("/login/agent", authController.loginAgent);

// Route de login générique (optionnelle)
router.post("/login", authController.login);

module.exports = router;