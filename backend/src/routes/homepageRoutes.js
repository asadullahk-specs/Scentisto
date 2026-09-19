const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const homepageSectionController = require("../controllers/homepageSectionController");

const router = express.Router();

router.get("/", asyncHandler(homepageSectionController.listPublic));

module.exports = router;
