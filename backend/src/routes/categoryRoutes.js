const express = require("express");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.get("/", categoryController.listPublic);
router.get("/:slug", categoryController.getPublicBySlug);

module.exports = router;
