const express = require("express");
const productController = require("../controllers/productController");

const router = express.Router();

// Public catalog - only published + visible products are ever returned
// (enforced in productModel.buildFilters, not just at the route layer).
router.get("/", productController.listPublic);
router.get("/:slug", productController.getPublicBySlug);
router.post("/:slug/presence", productController.heartbeatPresence);

module.exports = router;
