const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireScope } = require("../middleware/auth");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");
const authController = require("../controllers/authController");

const router = express.Router();

const emailRule = body("email")
  .isEmail()
  .withMessage("Enter a valid email address.")
  .normalizeEmail();
const passwordRule = body("password")
  .isString()
  .isLength({ min: 1 })
  .withMessage("Password is required.");

// ---- Storefront (customer) ----
router.post(
  "/register",
  registerLimiter,
  [
    body("firstName").trim().notEmpty().withMessage("First name is required."),
    body("lastName").trim().notEmpty().withMessage("Last name is required."),
    emailRule,
    body("phone")
      .optional({ checkFalsy: true })
      .isMobilePhone("any")
      .withMessage("Enter a valid phone number."),
    body("password").isString(),
  ],
  validate,
  authController.register,
);

router.post(
  "/login",
  loginLimiter,
  [emailRule, passwordRule],
  validate,
  authController.loginStorefront,
);

router.get("/me", requireAuth, requireScope("storefront"), authController.me);
router.post("/logout", requireAuth, authController.logout);

// ---- Admin CMS ----
router.post(
  "/admin/login",
  loginLimiter,
  [emailRule, passwordRule],
  validate,
  authController.loginAdmin,
);

router.get("/admin/me", requireAuth, requireScope("admin"), authController.me);

module.exports = router;
