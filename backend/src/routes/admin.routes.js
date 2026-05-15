const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Inscription (pas protégée – selon votre besoin, vous pouvez la protéger)
router.post("/register", adminController.createAdmin);

// Connexion (publique)
router.post("/login", adminController.login);

// Récupérer tous les admins (protégé, rôle admin)
router.get("/", verifyToken, authorizeRoles("admin"), adminController.getAdmins);

// Supprimer un admin (protégé, rôle admin)
router.delete("/:id", verifyToken, authorizeRoles("admin"), adminController.deleteAdmin);

module.exports = router;