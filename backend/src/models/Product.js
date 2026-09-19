/**
 * src/models/Product.js
 *
 * The single biggest change from the MySQL design: ML variants,
 * gallery media, and long-form details were separate joined tables
 * (product_variants, product_media, product_details) because a
 * relational row can't hold a variable-length list. In MongoDB they
 * are simply embedded arrays/objects on the product document - they
 * were always fetched together with the product anyway, so this
 * removes three joins per request and makes "get one product with
 * everything" a single, atomic document read.
 *
 * Gift pack contents and related-product curation (previously their
 * own join tables) are embedded arrays for the same reason.
 * Category/Collection membership stay as ObjectId references since
 * those are genuinely separate, independently-managed entities.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const PRODUCT_TYPES = ["perfume", "bottle", "gift_pack", "accessory"];
const STATUSES = ["draft", "published", "unpublished", "archived"];
const RELATION_TYPES = [
  "frequently_bought_together",
  "people_also_bought",
  "recommended",
  "bundle",
];

const variantSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 50 }, // "30ml", "50ml", "Standard"...
    sizeMl: { type: Number, default: null },

    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },

    sku: { type: String, required: true, trim: true },
    barcode: { type: String, default: null },

    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 5 },

    weightGrams: { type: Number, default: null },
    dimensions: { type: Schema.Types.Mixed, default: null }, // { heightCm, widthCm, depthCm }

    isDefault: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true, ...withId },
);

const mediaSchema = new Schema(
  {
    mediaType: {
      type: String,
      enum: ["image", "video", "360"],
      required: true,
    },
    url: { type: String, required: true },
    source: {
      type: String,
      enum: ["google_drive", "external"],
      default: "google_drive",
    },
    altText: { type: String, default: null },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, ...withId },
);

const faqSchema = new Schema(
  { question: String, answer: String },
  { _id: false },
);

const detailsSchema = new Schema(
  {
    story: { type: String, default: null },
    ingredients: { type: String, default: null },
    howToUse: { type: String, default: null },
    warnings: { type: String, default: null },
    longevity: { type: String, default: null },
    projection: { type: String, default: null },
    sillage: { type: String, default: null },
    season: { type: String, default: null },
    occasion: { type: String, default: null },
    topNotes: { type: [String], default: [] },
    middleNotes: { type: [String], default: [] },
    baseNotes: { type: [String], default: [] },
    authenticityInfo: { type: String, default: null },
    packagingInfo: { type: String, default: null },
    shippingInfo: { type: String, default: null },
    returnsInfo: { type: String, default: null },
    faqs: { type: [faqSchema], default: [] },
  },
  { _id: false },
);

const giftPackItemSchema = new Schema(
  {
    includedProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    includedVariantId: { type: Schema.Types.ObjectId, default: null },
    quantity: { type: Number, default: 1, min: 1 },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const relatedProductSchema = new Schema(
  {
    relatedProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    relationType: { type: String, enum: RELATION_TYPES, required: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    type: { type: String, enum: PRODUCT_TYPES, required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 220,
    },
    brand: { type: String, default: "SCENTISTO", trim: true },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    shortDescription: { type: String, default: null, maxlength: 500 },
    description: { type: String, default: null },

    sku: { type: String, required: true, unique: true, trim: true },
    barcode: { type: String, default: null },

    price: { type: Number, required: true, min: 0, default: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    costPrice: { type: Number, default: null },
    hasVariants: { type: Boolean, default: true },

    gender: {
      type: String,
      enum: ["men", "women", "unisex", null],
      default: null,
    },
    fragranceFamily: { type: String, default: null },

    primaryMediaType: {
      type: String,
      enum: ["image", "video", "auto"],
      default: "auto",
    },
    primaryMediaUrl: { type: String, default: null },
    hoverImageUrl: { type: String, default: null },

    status: { type: String, enum: STATUSES, default: "draft", index: true },

    isVisible: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isTopSelling: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isLimitedEdition: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: false },
    isCategoryFeatured: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    isGiftEligible: { type: Boolean, default: true },

    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
    metaKeywords: { type: String, default: null },
    canonicalUrl: { type: String, default: null },

    viewsCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    publishedAt: { type: Date, default: null },

    variants: { type: [variantSchema], default: [] },
    media: { type: [mediaSchema], default: [] },
    details: { type: detailsSchema, default: () => ({}) },
    giftPackItems: { type: [giftPackItemSchema], default: [] },
    relatedProducts: { type: [relatedProductSchema], default: [] },
    collectionIds: {
      type: [Schema.Types.ObjectId],
      ref: "Collection",
      default: [],
    },
  },
  { timestamps: true, ...withId },
);

productSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });
productSchema.index({ status: 1, isVisible: 1, showOnHomepage: 1 });
productSchema.index({
  name: "text",
  shortDescription: "text",
  description: "text",
});

module.exports = model("Product", productSchema);
module.exports.PRODUCT_TYPES = PRODUCT_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.RELATION_TYPES = RELATION_TYPES;
