// ======================= routes/agent.routes.js =======================
const express = require("express");
const router = express.Router();
const controller = require("../controllers/agent.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes accessibles selon les rôles

// GET - Tous les agents (admin: tous, semi-admin: actifs, agent: autres agents)
router.get("/", verifyToken, controller.getAgents);
router.get("/stats", verifyToken, authorizeRoles("admin", "semi-admin"), controller.getGlobalAgentStats);

// GET - Agent par ID (avec vérification des droits)
router.get("/:id", verifyToken, controller.getAgentById);

// GET - Profil de l'agent connecté (pour agent seulement)
router.get("/me/profile", verifyToken, authorizeRoles("agent"), controller.getCurrentAgent);

// Routes admin seulement
router.post("/", verifyToken, authorizeRoles("admin"), controller.createAgent);
router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updateAgent);
router.put("/:id/status", verifyToken, authorizeRoles("admin"), controller.toggleAgentStatus);
router.put("/:id/can-process", verifyToken, authorizeRoles("admin"), controller.toggleCanProcess);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deleteAgent);
router.delete("/:id/hard", verifyToken, authorizeRoles("admin"), controller.hardDeleteAgent);

// Routes pour changement de mot de passe (admin ou agent)
router.put("/:id/password", verifyToken, controller.updatePassword);

// Routes admin et semi-admin pour statistiques
router.get("/country/:country_id", verifyToken, authorizeRoles("admin", "semi-admin"), controller.getAgentsByCountry);
router.get("/country/:country_id/count", verifyToken, authorizeRoles("admin", "semi-admin"), controller.countAgentsByCountry);

module.exports = router;