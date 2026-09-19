const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const orderController = require("../controllers/orderController");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));

router.get("/", asyncHandler(orderController.listAdmin));
router.get(
  "/:id",
  [param("id").isMongoId()],
  validate,
  asyncHandler(orderController.getAdminById),
);

// Status changes (fulfillment, cancellation, refund marking) are
// restricted to roles that actually handle orders/warehouse - read
// access above is open to any admin-scope staff member.
router.patch(
  "/:id/status",
  requireRole(
    "super_admin",
    "admin",
    "manager",
    "warehouse",
    "customer_support",
  ),
  [
    param("id").isMongoId(),
    body("status").isString(),
    body("trackingNumber")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }),
    body("courierCompany")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }),
    body("internalNotes")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 }),
  ],
  validate,
  asyncHandler(orderController.updateStatusAdmin),
);

module.exports = router;
