const router = require("express").Router();
const controller = require("../controllers/benefit.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  controller.getTotalBenefit
);

module.exports = router;