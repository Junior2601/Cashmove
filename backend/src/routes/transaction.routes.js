// routes/transaction.routes.js
const router = require("express").Router();
const controller = require("../controllers/transaction.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes publiques (statiques d'abord)
router.post("/", controller.createTransaction);
router.get("/track/:code", controller.trackTransaction);
router.put("/validate/:id", controller.validateTransaction);

// Routes protégées - statiques
router.get(
  "/my-transactions",
  verifyToken,
  authorizeRoles("agent"),
  controller.getMyTransactions
);

router.get(
  "/all",
  verifyToken,
  authorizeRoles("admin", "semi_admin"),
  controller.getAllTransactions
);

// Routes protégées avec paramètre id
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

router.get(
  "/:id/history",
  verifyToken,
  authorizeRoles("admin", "semi_admin", "agent"),
  controller.getTransactionHistory
);

// Route dynamique (doit être la dernière)
router.get('/:transaction_id', controller.getTransactionByIdController);

module.exports = router;