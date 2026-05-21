// routes/transaction.routes.js
const router = require("express").Router();
const controller = require("../controllers/transaction.controller");
const { verifyToken, authorizeRoles, optionalToken } = require("../middlewares/auth.middleware");

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
  authorizeRoles("admin", "semi-admin"),
  controller.getAllTransactions
);

router.get(
  "/stats",
  verifyToken,
  authorizeRoles("admin", "semi-admin"),
  controller.getDashboardStats
);

router.get(
  "/chart",
  verifyToken,
  authorizeRoles("admin", "semi-admin"),
  controller.getChartData
);

router.get(
  "/recent",
  verifyToken,
  authorizeRoles("admin", "semi-admin"),
  controller.getRecentTransactions
);

router.get(
  "/export",
  verifyToken,
  authorizeRoles("admin", "semi-admin"),
  controller.exportTransactionsToCsv
);

// Routes protégées avec paramètre id
router.put(
  "/process/:id",
  verifyToken,
  authorizeRoles("admin", "semi-admin", "agent"),
  controller.finalizeTransaction
);

router.put(
  "/cancel/:id",
  verifyToken,
  authorizeRoles("admin", "semi-admin", "agent"),
  controller.cancelTransaction
);

router.get(
  "/:id/history",
  verifyToken,
  authorizeRoles("admin", "semi-admin", "agent"),
  controller.getTransactionHistory
);

// Route dynamique (doit être la dernière)
router.get('/:transaction_id', optionalToken, controller.getTransactionByIdController);

module.exports = router;