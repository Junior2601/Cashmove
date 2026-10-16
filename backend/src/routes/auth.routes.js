const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const clientAuthController = require("../controllers/clientAuth.controller");

// Routes de login séparées par rôle
router.post("/login/admin", authController.loginAdmin);
router.post("/login/semi-admin", authController.loginSemiAdmin);
router.post("/login/agent", authController.loginAgent);

// Route de login générique (optionnelle)
router.post("/login", authController.login);

// Clients V2 : connexion par e-mail + code (envoyé via Resend)
router.post("/email/request", clientAuthController.requestCode);
router.post("/email/verify", clientAuthController.verifyCode);
router.post("/refresh", clientAuthController.refresh);
router.post("/logout", clientAuthController.logout);

module.exports = router;