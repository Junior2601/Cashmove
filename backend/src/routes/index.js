const express = require("express");
const router = express.Router();

const adminRoutes = require("./admin.routes");
const semiAdminRoutes = require("./semiAdmin.routes");
const currencyRoutes = require("./currency.routes");
const countryRoutes = require("./country.routes");
const authRoutes = require("./auth.routes");
const agentRoutes = require("./agent.routes");
const paymentRoutes = require("./paymentMethod.routes");
const balanceRoutes = require("./balance.routes");
const autorisenumRoutes = require("./authorizedNumber.routes");
const rateRoutes = require("./rate.routes");
const historyRoutes = require("./history.routes");
const transactionRoutes = require("./transaction.routes");
const redirectionRoutes = require("./redirection.routes");
const profitRoutes = require("./profit.routes");
// const benefitRoutes = require("./benefit.routes");


router.use("/admins", adminRoutes);
router.use("/semi_admins", semiAdminRoutes);
router.use("/currencies", currencyRoutes);
router.use("/countries", countryRoutes);
router.use("/auth", authRoutes);
router.use("/agents", agentRoutes);
router.use("/payment-methods", paymentRoutes);
router.use("/balances", balanceRoutes);
router.use("/authorized_numbers", autorisenumRoutes);
router.use("/rates", rateRoutes);
router.use("/history", historyRoutes);
router.use("/transactions", transactionRoutes);
router.use("/redirections", redirectionRoutes);
router.use("/profit", profitRoutes);
// router.use("/benefit", benefitRoutes);

// route test
router.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

module.exports = router;