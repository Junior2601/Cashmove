const express = require("express");
const router = express.Router();
const controller = require("../controllers/authorizedNumber.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Routes publiques (accès sans authentification)
router.get("/", controller.getAllAuthorizedNumbers);
router.post("/", verifyToken, authorizeRoles("admin"), controller.createAuthorizedNumber);
router.get("/me", verifyToken, authorizeRoles("agent"), controller.getMyAuthorizedNumbers);
router.get("/:id", controller.getAuthorizedNumberById);
router.get("/country/:country_id", controller.getAuthorizedNumbersByCountry);
router.get("/agent/:agent_id", controller.getAuthorizedNumbersByAgent);

// Routes admin seulement

router.put("/:id", verifyToken, authorizeRoles("admin"), controller.updateAuthorizedNumber);
router.patch("/:id/disable", verifyToken, authorizeRoles("admin"), controller.disableAuthorizedNumber);
router.patch("/:id/reactivate", verifyToken, authorizeRoles("admin"), controller.reactivateAuthorizedNumber);
router.delete("/:id", verifyToken, authorizeRoles("admin"), controller.deleteAuthorizedNumber);

// Route admin pour voir par méthode de paiement
router.get(
  "/payment-method/:payment_method_id",
  verifyToken,
  authorizeRoles("admin"),
  controller.getAuthorizedNumbersByPaymentMethod
);

module.exports = router;