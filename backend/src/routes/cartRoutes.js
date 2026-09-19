const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireScope } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const cartController = require("../controllers/cartController");

const router = express.Router();

router.use(requireAuth, requireScope("storefront"));

router.get("/", asyncHandler(cartController.getCart));

router.post(
  "/items",
  [
    body("productId").isMongoId(),
    body("quantity").optional().isInt({ min: 1 }),
  ],
  validate,
  asyncHandler(cartController.addItem),
);

router.put(
  "/items/:itemId",
  [param("itemId").isMongoId(), body("quantity").isInt({ min: 0 })],
  validate,
  asyncHandler(cartController.updateItem),
);

router.delete(
  "/items/:itemId",
  [param("itemId").isMongoId()],
  validate,
  asyncHandler(cartController.removeItem),
);

router.post(
  "/merge",
  [body("items").isArray()],
  validate,
  asyncHandler(cartController.mergeCart),
);

module.exports = router;
