const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));
const CAN_MODERATE = requireRole(
  "super_admin",
  "admin",
  "manager",
  "marketing",
  "customer_support",
);

router.get("/", asyncHandler(reviewController.listAdmin));

router.patch(
  "/:id/status",
  CAN_MODERATE,
  [
    param("id").isMongoId(),
    body("status").isIn(["pending", "approved", "rejected"]),
  ],
  validate,
  asyncHandler(reviewController.setStatusAdmin),
);

router.patch(
  "/:id/featured",
  CAN_MODERATE,
  [param("id").isMongoId(), body("isFeatured").isBoolean()],
  validate,
  asyncHandler(reviewController.setFeaturedAdmin),
);

router.post(
  "/:id/reply",
  CAN_MODERATE,
  [
    param("id").isMongoId(),
    body("adminReply").trim().isLength({ min: 1, max: 1000 }),
  ],
  validate,
  asyncHandler(reviewController.replyAdmin),
);

router.delete(
  "/:id",
  requireRole("super_admin", "admin"),
  [param("id").isMongoId()],
  validate,
  asyncHandler(reviewController.removeAdmin),
);

module.exports = router;
