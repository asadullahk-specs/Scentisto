const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireScope } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

// Public - anyone can read approved reviews for a product.
router.get(
  "/product/:slug",
  [param("slug").isString()],
  validate,
  asyncHandler(reviewController.listForProduct),
);

// Only a logged-in customer can submit a review. Length rules
// (>=150 chars without a photo, >=80 with one - Section 23/31 of the
// CMS spec) are enforced server-side in reviewModel.js regardless of
// what these validators catch first.
router.post(
  "/",
  requireAuth,
  requireScope("storefront"),
  [
    body("productId").isMongoId(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("reviewText").trim().isLength({ min: 1, max: 3000 }),
    body("images").optional().isArray({ max: 6 }),
  ],
  validate,
  asyncHandler(reviewController.create),
);

module.exports = router;
