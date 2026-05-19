// routes/profit.routes.js
const router = require("express").Router();
const { getProfit, getCurrentBalances, takeSnapshot } = require("../controllers/profit.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Toutes les routes profit sont réservées aux admins
router.use(verifyToken, authorizeRoles("admin", "semi-admin"));

// GET /api/profit?period=day|week|month&date=YYYY-MM-DD
router.get("/", getProfit);

// GET /api/profit/current
router.get("/current", getCurrentBalances);

// POST /api/profit/snapshot  { "type": "start_of_day" | "end_of_day" }
router.post("/snapshot", authorizeRoles("admin"), takeSnapshot);

module.exports = router;