// routes/me.routes.js — espace client connecté (cahier V2)
const router = require("express").Router();
const controller = require("../controllers/me.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.use(verifyToken, authorizeRoles("client"));

// Profil (CPT-03/04/05)
router.get("/", controller.getProfile);
router.patch("/", controller.updateProfile);
router.delete("/", controller.deleteAccount);
router.get("/export", controller.exportData);
router.put("/pin", controller.changePin);
router.post("/pin/verify", controller.checkPin);
router.post("/pin/forgot", controller.forgotPin);

// Mes numéros d'envoi (NUM-01)
router.get("/accounts", controller.listAccounts);
router.post("/accounts", controller.createAccount);
router.get("/accounts/:id", controller.getAccount);
router.patch("/accounts/:id", controller.updateAccount);
router.delete("/accounts/:id", controller.deleteAccountEntry);

// Bénéficiaires (NUM-02/03)
router.get("/beneficiaries", controller.listBeneficiaries);
router.post("/beneficiaries", controller.createBeneficiary);
router.get("/beneficiaries/:id", controller.getBeneficiary);
router.patch("/beneficiaries/:id", controller.updateBeneficiary);
router.delete("/beneficiaries/:id", controller.deleteBeneficiary);

// Centre de notifications (NOT-03)
router.get("/notifications", controller.listNotifications);
router.patch("/notifications/read", controller.markAllRead);
router.patch("/notifications/:id/read", controller.markOneRead);

// Historique (TRX-04) et détail avec frise (TRX-05)
router.get("/transactions", controller.listTransactions);
router.get("/transactions/:ref", controller.getTransaction);

module.exports = router;
