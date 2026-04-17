const router = require("express").Router();

const controller = require("../controllers/rate.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// ======================
// ROUTES PUBLIQUES (sans authentification)
// ======================
router.get("/active", controller.getActiveRates);
router.get("/active/pair/:from_currency_id/:to_currency_id", controller.getActiveRateByPair);
router.get("/active/codes/:from_code/:to_code", controller.getActiveRateByCodes);
router.get("/active/country/:country_id", controller.getActiveRatesByCountry);
router.get("/active/currency/:currency_id", controller.getActiveRatesByCurrency);
router.post("/convert", controller.convertCurrency);

// ======================
// ROUTES ADMIN (authentification requise)
// ======================
// CREATE ou UPDATE
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  controller.createOrUpdateRate
);

// GET ALL (admin seulement)
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  controller.getAllRates
);

// GET BY ID (admin seulement)
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  controller.getRateById
);

// UPDATE
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  controller.updateRate
);

// TOGGLE ACTIVE
router.patch(
  "/:id/toggle",
  verifyToken,
  authorizeRoles("admin"),
  controller.toggleRateActive
);

// SOFT DELETE
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  controller.deleteRate
);

// HARD DELETE
router.delete(
  "/:id/hard",
  verifyToken,
  authorizeRoles("admin"),
  controller.hardDeleteRate
);

module.exports = router;