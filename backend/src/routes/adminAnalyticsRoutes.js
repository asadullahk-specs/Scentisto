const express = require("express");
const { query } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));

// Dashboard is read-only and has no financial detail beyond what
// Orders/Reviews already expose to any admin-scope staff member -
// open to all of them, same convention as GET /admin/orders.
router.get(
  "/dashboard",
  [query("days").optional().isIn(["7", "30", "90"])],
  validate,
  asyncHandler(analyticsController.getDashboard),
);

// The full audit trail (who did what, including previous/new values
// on every write) is more sensitive than the summary dashboard -
// restricted to the roles that actually need it.
router.get(
  "/activity-log",
  requireRole("super_admin", "admin", "manager"),
  [
    query("action").optional().isString().trim().isLength({ max: 100 }),
    query("entityType").optional().isString().trim().isLength({ max: 100 }),
    query("userId").optional().isMongoId(),
  ],
  validate,
  asyncHandler(analyticsController.getActivityLog),
);

module.exports = router;
