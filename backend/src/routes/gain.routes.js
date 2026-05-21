const express = require("express");
const router = express.Router();
const GainController = require("../controllers/gain.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes accessibles uniquement aux admins
router.get("/", verifyToken, authorizeRoles("admin"), GainController.getAllGains);
router.get("/summary/current-month", verifyToken, authorizeRoles("admin"), GainController.getGlobalCurrentMonthSummary);
router.get("/history/monthly", verifyToken, authorizeRoles("admin"), GainController.getMonthlyHistory);
router.get("/agent/:agentId/grouped-by-currency", verifyToken, authorizeRoles("admin"), GainController.getGainsGroupedByCurrency);
router.get("/agent/:agentId/monthly", verifyToken, authorizeRoles("admin"), GainController.getMonthlyGainsByAgent);
router.get("/agent/:agentId/detailed", verifyToken, authorizeRoles("admin"), GainController.getDetailedGainsByAgent);

// Routes accessibles aux admins et aux agents (pour eux-mêmes)
router.get("/agent/:agentId", verifyToken, authorizeRoles("admin", "agent"), GainController.getGainsByAgent);
router.get("/agent/:agentId/current-month/:currencyCode", verifyToken, authorizeRoles("admin", "agent"), GainController.getCurrentMonthTotal);

module.exports = router;