const express = require("express");
const { param, query } = require("express-validator");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const blogController = require("../controllers/blogController");

const router = express.Router();

router.get(
  "/",
  [query("tag").optional().isString().trim()],
  validate,
  asyncHandler(blogController.listPublic),
);
router.get(
  "/:slug",
  [param("slug").isString()],
  validate,
  asyncHandler(blogController.getPublicBySlug),
);

module.exports = router;
