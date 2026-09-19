const express = require("express");
const { param } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireScope } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));

router.get("/", asyncHandler(notificationController.list));
router.get("/unread-count", asyncHandler(notificationController.unreadCount));
router.patch(
  "/:id/read",
  [param("id").isMongoId()],
  validate,
  asyncHandler(notificationController.markRead),
);
router.patch("/read-all", asyncHandler(notificationController.markAllRead));

module.exports = router;
