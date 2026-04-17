const express = require("express");
const router = express.Router();

const currencyController = require("../controllers/currency.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// Routes publiques (accessibles sans authentification)
router.get("/", currencyController.getCurrencies);
router.get("/:id", currencyController.getCurrencyById);

// Routes protégées - Admin uniquement
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  currencyController.createCurrency
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  currencyController.updateCurrency
);

router.patch(
  "/:id/disable",
  verifyToken,
  authorizeRoles("admin"),
  currencyController.disableCurrency
);

router.patch(
  "/:id/reactivate",
  verifyToken,
  authorizeRoles("admin"),
  currencyController.reactivateCurrency
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  currencyController.deleteCurrency
);

module.exports = router;