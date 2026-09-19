const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireScope } = require("../middleware/auth");
const { orderLimiter } = require("../middleware/rateLimiter");
const asyncHandler = require("../utils/asyncHandler");
const orderController = require("../controllers/orderController");

const router = express.Router();

router.use(requireAuth, requireScope("storefront"));

const shippingAddressValidators = [
  body("shippingAddress.firstName").trim().notEmpty(),
  body("shippingAddress.lastName").trim().notEmpty(),
  body("shippingAddress.phone").trim().notEmpty(),
  body("shippingAddress.email").isEmail().normalizeEmail(),
  body("shippingAddress.country").trim().notEmpty(),
  body("shippingAddress.city").trim().notEmpty(),
  body("shippingAddress.state").trim().notEmpty(),
  body("shippingAddress.address").trim().notEmpty().isLength({ max: 500 }),
  body("shippingAddress.notes")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }),
];

// Order placement is rate-limited like login/register - it's a
// state-changing, stock-affecting endpoint, not just a read.
router.post(
  "/",
  orderLimiter,
  shippingAddressValidators,
  validate,
  asyncHandler(orderController.createOrder),
);

router.get("/", asyncHandler(orderController.listMyOrders));
router.get(
  "/:id",
  [param("id").isMongoId()],
  validate,
  asyncHandler(orderController.getMyOrder),
);

module.exports = router;
