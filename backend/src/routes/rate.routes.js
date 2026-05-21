const express = require("express");
const router = express.Router();
const controller = require("../controllers/rate.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// ======================
// ROUTES PUBLIQUES
// ======================
router.get("/active", controller.getActiveRates);
router.get("/stats", verifyToken, authorizeRoles("admin"), controller.getRateStats);
router.get("/active/pair/:from_currency_id/:to_currency_id", controller.getActiveRateByPair);
router.get("/active/codes/:from_code/:to_code", controller.getActiveRateByCodes);
router.get("/active/country/:country_id", controller.getActiveRatesByCountry);
router.get("/active/currency/:currency_id", controller.getActiveRatesByCurrency);
router.post("/convert", controller.convertCurrency);

// ======================
// ROUTES ADMIN (authentification requise)
// ======================
router.post("/", verifyToken, authorizeRoles("admin"), controller.upsertRate);
router.get("/", verifyToken, authorizeRoles("admin"), controller.getAllRates);
router.get("/:id", verifyToken, authorizeRoles("admin"), controller.getRateById);
router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updateRate);
router.patch("/:id/toggle", verifyToken, authorizeRoles("admin"), controller.toggleRateActive);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deleteRate);
router.delete("/:id/hard", verifyToken, authorizeRoles("admin"), controller.hardDeleteRate);

module.exports = router;