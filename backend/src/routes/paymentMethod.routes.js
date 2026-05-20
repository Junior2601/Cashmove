const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentMethod.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes publiques — statiques AVANT dynamiques
router.get("/", controller.getAllPaymentMethods);
router.get("/country/:countryId", controller.getPaymentMethodsByCountry); // ← monté avant /:id
router.get("/:id", controller.getPaymentMethodById);

// Routes protégées - Admin seulement
router.post("/", verifyToken, authorizeRoles("admin"), controller.createPaymentMethod);
router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updatePaymentMethod);
router.patch("/:id/disable", verifyToken, authorizeRoles("admin"), controller.disablePaymentMethod);
router.patch("/:id/reactivate", verifyToken, authorizeRoles("admin"), controller.reactivatePaymentMethod);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deletePaymentMethod);

module.exports = router;