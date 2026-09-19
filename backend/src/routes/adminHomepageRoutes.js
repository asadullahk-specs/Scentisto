const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const homepageSectionController = require("../controllers/homepageSectionController");
const { SECTION_TYPES } = require("../models/HomepageSection");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));
const CAN_WRITE = requireRole(
  "super_admin",
  "admin",
  "marketing",
  "content_editor",
);

router.get("/", asyncHandler(homepageSectionController.listAdmin));

router.post(
  "/",
  CAN_WRITE,
  [body("type").isIn(SECTION_TYPES), body("title").trim().notEmpty()],
  validate,
  asyncHandler(homepageSectionController.createAdmin),
);

router.put(
  "/reorder",
  CAN_WRITE,
  [body("orderedIds").isArray()],
  validate,
  asyncHandler(homepageSectionController.reorderAdmin),
);

router.put(
  "/:id",
  CAN_WRITE,
  [param("id").isMongoId()],
  validate,
  asyncHandler(homepageSectionController.updateAdmin),
);

router.delete(
  "/:id",
  requireRole("super_admin", "admin"),
  [param("id").isMongoId()],
  validate,
  asyncHandler(homepageSectionController.removeAdmin),
);

module.exports = router;
