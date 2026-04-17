const router = require("express").Router();
const controller = require("../controllers/paymentMethod.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes publiques (accessibles sans authentification)
router.get("/", controller.getAllPaymentMethods);
router.get("/:id", controller.getPaymentMethodById);
router.get("/country/:countryId", controller.getPaymentMethodsByCountry);

// Routes protégées - Admin uniquement
router.post("/", verifyToken, authorizeRoles("admin"), controller.createPaymentMethod);
router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updatePaymentMethod);
router.patch("/:id/disable", verifyToken, authorizeRoles("admin"), controller.disablePaymentMethod);
router.patch("/:id/reactivate", verifyToken, authorizeRoles("admin"), controller.reactivatePaymentMethod);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deletePaymentMethod);

module.exports = router;