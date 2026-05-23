const express = require("express");
const router = express.Router();
const controller = require("../controllers/balance.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes accessibles selon rôles (vérification dans le controller via service)
router.get("/", verifyToken, controller.getAllBalances);
router.post("/", verifyToken, authorizeRoles("admin"), controller.createBalance);
router.get("/:id", verifyToken, controller.getBalanceById);
router.get("/agent/:agent_id", verifyToken, controller.getBalancesByAgent);
router.get("/agent/:agent_id/total", verifyToken, controller.getTotalBalanceByAgent);

// Routes admin seulement

router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updateBalance);
router.patch("/:id/credit", verifyToken, authorizeRoles("admin"), controller.creditBalance);
router.patch("/:id/debit", verifyToken, authorizeRoles("admin"), controller.debitBalance);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deleteBalance);
router.delete("/:id/hard", verifyToken, authorizeRoles("admin"), controller.hardDeleteBalance);

// Admin seulement pour voir par devise
router.get("/currency/:currency_id", verifyToken, authorizeRoles("admin"), controller.getBalancesByCurrency);

module.exports = router;