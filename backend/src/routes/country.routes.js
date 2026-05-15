const express = require("express");
const router = express.Router();
const countryController = require("../controllers/country.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes publiques
router.get("/", countryController.getCountries);
router.get("/:id", countryController.getCountryById);

// Routes admin
router.post("/", verifyToken, authorizeRoles("admin"), countryController.createCountry);
router.put("/:id", verifyToken, authorizeRoles("admin"), countryController.updateCountry);
router.patch("/:id/disable", verifyToken, authorizeRoles("admin"), countryController.disableCountry);
router.patch("/:id/reactivate", verifyToken, authorizeRoles("admin"), countryController.reactivateCountry);
router.delete("/:id", verifyToken, authorizeRoles("admin"), countryController.deleteCountry);

module.exports = router;