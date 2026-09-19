const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const {
  requireAuth,
  requireScope,
  requireRole,
} = require("../middleware/auth");
const productController = require("../controllers/productController");

const router = express.Router();

// Every route in this file requires a valid admin-scope session.
router.use(requireAuth, requireScope("admin"));

// Roles allowed to create/edit/delete products. Read access is open to
// any authenticated admin-scope staff member; the full permission-matrix
// UI (per-role, per-action) ships in the Phase 6 RBAC module - for now
// this is the coarse-grained guard.
const CAN_WRITE = requireRole("super_admin", "admin", "manager");

const idParam = param("id").isMongoId().withMessage("Invalid product id.");

// ---- Media Library (aggregated view across all products) ----
router.get("/media-library", productController.listMediaLibraryAdmin);

// ---- Products ----
router.get("/", productController.listAdmin);
router.get("/:id", idParam, validate, productController.getAdminById);

router.post(
  "/",
  CAN_WRITE,
  [
    body("type").isIn(["perfume", "bottle", "gift_pack", "accessory"]),
    body("name").trim().notEmpty(),
    body("sku").trim().notEmpty(),
    body("price").isFloat({ min: 0 }),
  ],
  validate,
  productController.createAdmin,
);

router.put("/:id", CAN_WRITE, idParam, validate, productController.updateAdmin);

router.patch(
  "/:id/status",
  CAN_WRITE,
  [
    idParam,
    body("status").isIn(["draft", "published", "unpublished", "archived"]),
  ],
  validate,
  productController.patchStatusAdmin,
);

router.post(
  "/:id/duplicate",
  CAN_WRITE,
  idParam,
  validate,
  productController.duplicateAdmin,
);

router.delete(
  "/:id",
  requireRole("super_admin", "admin"),
  idParam,
  validate,
  productController.removeAdmin,
);

// ---- ML Variants ----
router.get(
  "/:id/variants",
  idParam,
  validate,
  productController.listVariantsAdmin,
);
router.post(
  "/:id/variants",
  CAN_WRITE,
  [
    idParam,
    body("label").trim().notEmpty(),
    body("price").isFloat({ min: 0 }),
    body("sku").trim().notEmpty(),
  ],
  validate,
  productController.createVariantAdmin,
);
router.put(
  "/:id/variants/:variantId",
  CAN_WRITE,
  [idParam, param("variantId").isMongoId()],
  validate,
  productController.updateVariantAdmin,
);
router.delete(
  "/:id/variants/:variantId",
  CAN_WRITE,
  [idParam, param("variantId").isMongoId()],
  validate,
  productController.removeVariantAdmin,
);

// ---- Media gallery ----
router.get("/:id/media", idParam, validate, productController.listMediaAdmin);
router.post(
  "/:id/media",
  CAN_WRITE,
  [idParam, body("url").isString().notEmpty()],
  validate,
  productController.createMediaAdmin,
);
router.put(
  "/:id/media/:mediaId",
  CAN_WRITE,
  [idParam, param("mediaId").isMongoId()],
  validate,
  productController.updateMediaAdmin,
);
router.post(
  "/:id/media/reorder",
  CAN_WRITE,
  [idParam, body("orderedIds").isArray()],
  validate,
  productController.reorderMediaAdmin,
);
router.delete(
  "/:id/media/:mediaId",
  CAN_WRITE,
  [idParam, param("mediaId").isMongoId()],
  validate,
  productController.removeMediaAdmin,
);

// ---- Long-form details (notes, story, ingredients, FAQs...) ----
router.get(
  "/:id/details",
  idParam,
  validate,
  productController.getDetailsAdmin,
);
router.put(
  "/:id/details",
  CAN_WRITE,
  idParam,
  validate,
  productController.upsertDetailsAdmin,
);

// ---- Related products (frequently bought together, recommended, bundles) ----
router.put(
  "/:id/related",
  CAN_WRITE,
  [
    idParam,
    body("relationType").isString(),
    body("relatedProductIds").isArray(),
  ],
  validate,
  productController.setRelatedAdmin,
);

// ---- Gift pack contents (bundles referencing other products) ----
router.put(
  "/:id/gift-pack-items",
  CAN_WRITE,
  [idParam, body("items").isArray()],
  validate,
  productController.setGiftPackItemsAdmin,
);

module.exports = router;
