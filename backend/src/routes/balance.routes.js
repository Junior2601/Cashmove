const router = require("express").Router();
const controller = require("../controllers/balance.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes accessibles selon les rôles

// GET - Toutes les balances (admin: toutes, semi-admin: toutes agents, agent: ses propres)
router.get("/", verifyToken, controller.getAllBalances);

// GET - Balance par ID (avec vérification des droits)
router.get("/:id", verifyToken, controller.getBalanceById);

// GET - Balances d'un agent spécifique
router.get("/agent/:agent_id", verifyToken, controller.getBalancesByAgent);

// GET - Solde total d'un agent
router.get("/agent/:agent_id/total", verifyToken, controller.getTotalBalanceByAgent);

// Routes admin seulement
router.post("/", verifyToken, authorizeRoles("admin"), controller.createBalance);
router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updateBalance);
router.patch("/:id/credit", verifyToken, authorizeRoles("admin"), controller.creditBalance);
router.patch("/:id/debit", verifyToken, authorizeRoles("admin"), controller.debitBalance);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deleteBalance);
router.delete("/:id/hard", verifyToken, authorizeRoles("admin"), controller.hardDeleteBalance);

// Route admin seulement pour voir par devise
router.get("/currency/:currency_id", verifyToken, authorizeRoles("admin"), controller.getBalancesByCurrency);

module.exports = router;