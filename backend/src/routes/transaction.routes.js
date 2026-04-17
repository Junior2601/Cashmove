// routes/transaction.routes.js
const router = require("express").Router();
const controller = require("../controllers/transaction.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes publiques
router.post("/", controller.createTransaction);
router.get("/track/:code", controller.trackTransaction);
router.put("/validate/:id", controller.validateTransaction);

// Routes protégées
router.put(
  "/process/:id",
  verifyToken,
  authorizeRoles("admin", "semi_admin", "agent"),
  controller.finalizeTransaction
);

router.put(
  "/cancel/:id",
  verifyToken,
  authorizeRoles("admin", "semi_admin", "agent"),
  controller.cancelTransaction
);

// Routes pour les agents (voir leurs transactions)
router.get(
  "/my-transactions",
  verifyToken,
  authorizeRoles("agent"),
  controller.getMyTransactions
);

// Routes pour admin et semi-admin (voir toutes les transactions)
router.get(
  "/all",
  verifyToken,
  authorizeRoles("admin", "semi_admin"),
  controller.getAllTransactions
);

// Historique d'une transaction
router.get(
  "/:id/history",
  verifyToken,
  authorizeRoles("admin", "semi_admin", "agent"),
  controller.getTransactionHistory
);

module.exports = router;