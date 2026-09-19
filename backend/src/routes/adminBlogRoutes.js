const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const blogController = require("../controllers/blogController");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));
const CAN_WRITE = requireRole(
  "super_admin",
  "admin",
  "marketing",
  "content_editor",
);

router.get("/", asyncHandler(blogController.listAdmin));
router.get(
  "/:id",
  [param("id").isMongoId()],
  validate,
  asyncHandler(blogController.getAdminById),
);

router.post(
  "/",
  CAN_WRITE,
  [
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("content").trim().isLength({ min: 1 }),
    body("slug").optional().trim().isLength({ max: 220 }),
    body("tags").optional().isArray({ max: 20 }),
  ],
  validate,
  asyncHandler(blogController.createAdmin),
);

router.put(
  "/:id",
  CAN_WRITE,
  [param("id").isMongoId(), body("tags").optional().isArray({ max: 20 })],
  validate,
  asyncHandler(blogController.updateAdmin),
);

router.patch(
  "/:id/status",
  CAN_WRITE,
  [param("id").isMongoId(), body("status").isIn(["draft", "published"])],
  validate,
  asyncHandler(blogController.setStatusAdmin),
);

router.delete(
  "/:id",
  requireRole("super_admin", "admin"),
  [param("id").isMongoId()],
  validate,
  asyncHandler(blogController.removeAdmin),
);

module.exports = router;
