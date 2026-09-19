const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const categoryController = require("../controllers/categoryController");
const collectionController = require("../controllers/collectionController");

const router = express.Router();

router.use(requireAuth, requireScope("admin"));
const CAN_WRITE = requireRole("super_admin", "admin", "manager", "marketing");

// ---- Categories ----
router.get("/categories", categoryController.listAdmin);
router.post(
  "/categories",
  CAN_WRITE,
  [body("name").trim().notEmpty()],
  validate,
  categoryController.createAdmin,
);
router.put(
  "/categories/:id",
  CAN_WRITE,
  [param("id").isMongoId()],
  validate,
  categoryController.updateAdmin,
);
router.delete(
  "/categories/:id",
  requireRole("super_admin", "admin"),
  [param("id").isMongoId()],
  validate,
  categoryController.removeAdmin,
);

// ---- Collections ----
router.get("/collections", collectionController.listAdmin);
router.post(
  "/collections",
  CAN_WRITE,
  [body("name").trim().notEmpty()],
  validate,
  collectionController.createAdmin,
);
router.put(
  "/collections/:id",
  CAN_WRITE,
  [param("id").isMongoId()],
  validate,
  collectionController.updateAdmin,
);
router.delete(
  "/collections/:id",
  requireRole("super_admin", "admin"),
  [param("id").isMongoId()],
  validate,
  collectionController.removeAdmin,
);

module.exports = router;
