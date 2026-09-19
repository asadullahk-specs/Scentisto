/**
 * src/models/productModel.js
 *
 * Wraps the Product Mongoose model with the same function names the
 * controllers already call. The list/filter query - previously raw
 * SQL with a HAVING clause on a derived effective_price - is now a
 * MongoDB aggregation pipeline. Variant/media/details operations,
 * previously separate model files hitting joined tables, now
 * mutate the embedded arrays/object directly on the Product
 * document (see Product.js for why).
 */
const Product = require("./Product");
const Category = require("./Category");
const Collection = require("./Collection");
const mongoose = require("mongoose");

const { ObjectId } = mongoose.Types;

// ---------------------------------------------------------------
// Effective price - mirrors the old SQL EFFECTIVE_PRICE_EXPR:
// MIN(sale_price||price) across visible variants if hasVariants,
// else the product's own sale_price||price.
// ---------------------------------------------------------------
function computeEffectivePrice(product) {
  if (product.hasVariants) {
    const visible = (product.variants || []).filter((v) => v.isVisible);
    if (visible.length === 0) return null;
    return Math.min(...visible.map((v) => v.salePrice ?? v.price));
  }
  return product.salePrice ?? product.price;
}

// ---------------------------------------------------------------
// LIST / FILTER (aggregation pipeline)
// ---------------------------------------------------------------

const SORT_MAP = {
  newest: { createdAt: -1 },
  price_low_high: { effectivePrice: 1 },
  price_high_low: { effectivePrice: -1 },
  popularity: { viewsCount: -1 },
  best_selling: { salesCount: -1 },
  name_asc: { name: 1 },
};

async function resolveCategoryId(slug) {
  if (!slug) return undefined;
  const category = await Category.findOne({ slug }).select("_id");
  return category ? category._id : new ObjectId(); // non-matching id if slug not found
}

async function resolveCollectionId(slug) {
  if (!slug) return undefined;
  const collection = await Collection.findOne({ slug }).select("_id");
  return collection ? collection._id : new ObjectId();
}

async function list(filters, { isAdmin = false, limit = 24, offset = 0 } = {}) {
  const baseMatch = {};

  if (filters.search) {
    baseMatch.$text = { $search: filters.search };
  }
  if (!isAdmin) {
    baseMatch.status = "published";
    baseMatch.isVisible = true;
  } else if (filters.status) {
    baseMatch.status = filters.status;
  }
  if (filters.type) baseMatch.type = filters.type;
  if (filters.categoryId)
    baseMatch.categoryId = new ObjectId(filters.categoryId);
  if (filters.categorySlug)
    baseMatch.categoryId = await resolveCategoryId(filters.categorySlug);
  if (filters.brand) baseMatch.brand = filters.brand;
  if (filters.gender) baseMatch.gender = filters.gender;
  if (filters.fragranceFamily)
    baseMatch.fragranceFamily = filters.fragranceFamily;
  if (filters.collectionSlug)
    baseMatch.collectionIds = await resolveCollectionId(filters.collectionSlug);
  if (filters.sizeMl) {
    baseMatch.variants = {
      $elemMatch: { sizeMl: filters.sizeMl, isVisible: true },
    };
  }
  if (filters.isFeatured) baseMatch.isFeatured = true;
  if (filters.isTopSelling) baseMatch.isTopSelling = true;
  if (filters.isBestSeller) baseMatch.isBestSeller = true;
  if (filters.isTrending) baseMatch.isTrending = true;
  if (filters.isLimitedEdition) baseMatch.isLimitedEdition = true;
  if (filters.isNewArrival) baseMatch.isNewArrival = true;
  if (filters.isFlashSale) baseMatch.isFlashSale = true;
  if (filters.showOnHomepage) baseMatch.showOnHomepage = true;

  const pipeline = [{ $match: baseMatch }];

  pipeline.push({
    $addFields: {
      effectivePrice: {
        $cond: [
          "$hasVariants",
          {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: "$variants",
                    cond: { $eq: ["$$this.isVisible", true] },
                  },
                },
                in: { $ifNull: ["$$this.salePrice", "$$this.price"] },
              },
            },
          },
          { $ifNull: ["$salePrice", "$price"] },
        ],
      },
      variantStockTotal: { $sum: "$variants.stock" },
      variantAvailableTotal: {
        $sum: {
          $map: {
            input: {
              $filter: {
                input: "$variants",
                cond: { $eq: ["$$this.isVisible", true] },
              },
            },
            in: { $subtract: ["$$this.stock", "$$this.reservedStock"] },
          },
        },
      },
    },
  });

  const computedMatch = {};
  if (filters.minPrice !== undefined)
    computedMatch.effectivePrice = {
      ...(computedMatch.effectivePrice || {}),
      $gte: filters.minPrice,
    };
  if (filters.maxPrice !== undefined)
    computedMatch.effectivePrice = {
      ...(computedMatch.effectivePrice || {}),
      $lte: filters.maxPrice,
    };
  if (filters.inStockOnly) {
    computedMatch.$or = [
      { hasVariants: false },
      { variantAvailableTotal: { $gt: 0 } },
    ];
  }
  if (Object.keys(computedMatch).length > 0) {
    pipeline.push({ $match: computedMatch });
  }

  const sort = SORT_MAP[filters.sortBy] || SORT_MAP.newest;

  pipeline.push({
    $facet: {
      data: [
        { $sort: sort },
        { $skip: offset },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "categoryDoc",
          },
        },
        { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: { $toString: "$_id" },
            type: 1,
            name: 1,
            slug: 1,
            brand: 1,
            categoryId: { $toString: "$categoryId" },
            categoryName: "$categoryDoc.name",
            sku: 1,
            price: 1,
            salePrice: 1,
            hasVariants: 1,
            gender: 1,
            fragranceFamily: 1,
            primaryMediaType: 1,
            primaryMediaUrl: 1,
            hoverImageUrl: 1,
            status: 1,
            isVisible: 1,
            isFeatured: 1,
            isTopSelling: 1,
            isBestSeller: 1,
            isTrending: 1,
            isLimitedEdition: 1,
            isNewArrival: 1,
            isFlashSale: 1,
            showOnHomepage: 1,
            viewsCount: 1,
            salesCount: 1,
            createdAt: 1,
            updatedAt: 1,
            effectivePrice: 1,
            variantStockTotal: 1,
            _id: 0,
          },
        },
      ],
      totalCount: [{ $count: "total" }],
    },
  });

  const [result] = await Product.aggregate(pipeline);
  const rows = result?.data || [];
  const total = result?.totalCount?.[0]?.total || 0;
  return { rows, total };
}

// ---------------------------------------------------------------
// SINGLE PRODUCT (full document - variants/media/details embedded)
// ---------------------------------------------------------------

async function getFullById(id, { isAdmin = false } = {}) {
  if (!ObjectId.isValid(id)) return null;
  const filter = { _id: id };
  if (!isAdmin) {
    filter.status = "published";
    filter.isVisible = true;
  }
  const doc = await Product.findOne(filter);
  if (!doc) return null;
  const obj = doc.toJSON();
  obj.effectivePrice = computeEffectivePrice(obj);
  return obj;
}

async function getFullBySlug(slug, { isAdmin = false } = {}) {
  const filter = { slug };
  if (!isAdmin) {
    filter.status = "published";
    filter.isVisible = true;
  }
  const doc = await Product.findOne(filter);
  if (!doc) return null;
  const obj = doc.toJSON();
  obj.effectivePrice = computeEffectivePrice(obj);
  return obj;
}

async function slugExists(slug, excludeId = null) {
  const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
  return Boolean(await Product.exists(filter));
}

async function skuExists(sku, excludeId = null) {
  const filter = excludeId ? { sku, _id: { $ne: excludeId } } : { sku };
  return Boolean(await Product.exists(filter));
}

async function variantSkuExists(sku, excludeVariantId = null) {
  const filter = excludeVariantId
    ? { "variants.sku": sku, "variants._id": { $ne: excludeVariantId } }
    : { "variants.sku": sku };
  return Boolean(await Product.exists(filter));
}

const FIELD_KEYS = [
  "type",
  "name",
  "slug",
  "brand",
  "categoryId",
  "shortDescription",
  "description",
  "sku",
  "barcode",
  "price",
  "salePrice",
  "costPrice",
  "hasVariants",
  "gender",
  "fragranceFamily",
  "primaryMediaType",
  "primaryMediaUrl",
  "hoverImageUrl",
  "status",
  "isVisible",
  "isFeatured",
  "isTopSelling",
  "isBestSeller",
  "isTrending",
  "isLimitedEdition",
  "isNewArrival",
  "isFlashSale",
  "showOnHomepage",
  "isCategoryFeatured",
  "isRecommended",
  "isGiftEligible",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "canonicalUrl",
];

function pickFields(data) {
  const set = {};
  for (const key of FIELD_KEYS) {
    if (data[key] !== undefined) set[key] = data[key];
  }
  return set;
}

async function create(data, adminUserId) {
  const doc = await Product.create({
    ...pickFields(data),
    createdBy: adminUserId || null,
    publishedAt: data.status === "published" ? new Date() : null,
  });
  return doc.id;
}

async function update(id, data) {
  const set = pickFields(data);
  if (Object.keys(set).length === 0) return;
  await Product.updateOne({ _id: id }, { $set: set });
}

async function patchStatus(id, status) {
  const set = { status };
  if (status === "published") set.publishedAt = new Date();
  await Product.updateOne({ _id: id }, { $set: set });
}

async function incrementViews(id) {
  await Product.updateOne({ _id: id }, { $inc: { viewsCount: 1 } });
}

// "N bought in the last 24 hours" on the product detail page - a real
// count off order line items, not a random/fake number, scoped to a
// single product and the same non-revenue-status exclusion
// analyticsModel.js uses everywhere else (cancelled/failed orders
// never happened as far as this count is concerned).
async function getPurchasesLast24h(productId) {
  const Order = require("./Order");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [result] = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        status: { $nin: ["cancelled", "failed_payment"] },
      },
    },
    { $unwind: "$items" },
    { $match: { "items.productId": new ObjectId(productId) } },
    { $group: { _id: null, quantity: { $sum: "$items.quantity" } } },
  ]);
  return result ? result.quantity : 0;
}

async function hardDelete(id) {
  await Product.deleteOne({ _id: id });
}

// ---------------------------------------------------------------
// Related products (embedded relatedProducts[])
// ---------------------------------------------------------------

async function getRelated(productId, relationType, limit = 8) {
  const product = await Product.findById(productId)
    .select("relatedProducts")
    .populate({
      path: "relatedProducts.relatedProductId",
      match: { status: "published", isVisible: true },
      select:
        "name slug primaryMediaUrl hoverImageUrl primaryMediaType price salePrice hasVariants variants",
    });
  if (!product) return [];

  return product.relatedProducts
    .filter((r) => r.relationType === relationType && r.relatedProductId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, limit)
    .map((r) => {
      const p = r.relatedProductId.toJSON
        ? r.relatedProductId.toJSON()
        : r.relatedProductId;
      return { ...p, effectivePrice: computeEffectivePrice(p) };
    });
}

async function setRelated(productId, relationType, relatedProductIds) {
  const product = await Product.findById(productId).select("relatedProducts");
  if (!product) return;
  product.relatedProducts = [
    ...product.relatedProducts.filter((r) => r.relationType !== relationType),
    ...relatedProductIds.map((relatedProductId, index) => ({
      relatedProductId,
      relationType,
      displayOrder: index,
    })),
  ];
  await product.save();
}

// ---------------------------------------------------------------
// Embedded ML variants
// ---------------------------------------------------------------

async function addVariant(productId, data) {
  const product = await Product.findById(productId);
  if (!product) return null;
  if (data.isDefault) product.variants.forEach((v) => (v.isDefault = false));
  product.variants.push({
    label: data.label,
    sizeMl: data.sizeMl || null,
    price: data.price,
    salePrice: data.salePrice ?? null,
    sku: data.sku,
    barcode: data.barcode || null,
    stock: data.stock || 0,
    reorderLevel: data.reorderLevel ?? 5,
    weightGrams: data.weightGrams || null,
    dimensions: data.dimensions || null,
    isDefault: Boolean(data.isDefault),
    isVisible: data.isVisible !== undefined ? Boolean(data.isVisible) : true,
    displayOrder: data.displayOrder || 0,
  });
  await product.save();
  return product.variants[product.variants.length - 1].id;
}

async function updateVariant(productId, variantId, data) {
  const product = await Product.findById(productId);
  if (!product) return;
  const variant = product.variants.id(variantId);
  if (!variant) return;
  if (data.isDefault) product.variants.forEach((v) => (v.isDefault = false));
  const UPDATABLE = [
    "label",
    "sizeMl",
    "price",
    "salePrice",
    "sku",
    "barcode",
    "stock",
    "reorderLevel",
    "weightGrams",
    "dimensions",
    "isDefault",
    "isVisible",
    "displayOrder",
  ];
  for (const key of UPDATABLE) {
    if (data[key] !== undefined) variant[key] = data[key];
  }
  await product.save();
}

async function removeVariant(productId, variantId) {
  const product = await Product.findById(productId);
  if (!product) return;
  product.variants.pull({ _id: variantId });
  await product.save();
}

// ---------------------------------------------------------------
// Embedded media gallery
// ---------------------------------------------------------------

async function addMedia(productId, data) {
  const product = await Product.findById(productId);
  if (!product) return null;
  product.media.push({
    mediaType: data.mediaType,
    url: data.url,
    source: data.source || "google_drive",
    altText: data.altText || null,
    displayOrder: data.displayOrder || product.media.length,
  });
  await product.save();
  return product.media[product.media.length - 1].id;
}

async function updateMedia(productId, mediaId, data) {
  const product = await Product.findById(productId);
  if (!product) return;
  const media = product.media.id(mediaId);
  if (!media) return;
  const UPDATABLE = ["mediaType", "url", "altText", "displayOrder", "isActive"];
  for (const key of UPDATABLE) {
    if (data[key] !== undefined) media[key] = data[key];
  }
  await product.save();
}

async function reorderMedia(productId, orderedIds) {
  const product = await Product.findById(productId);
  if (!product) return;
  orderedIds.forEach((mediaId, index) => {
    const media = product.media.id(mediaId);
    if (media) media.displayOrder = index;
  });
  await product.save();
}

async function removeMedia(productId, mediaId) {
  const product = await Product.findById(productId);
  if (!product) return;
  product.media.pull({ _id: mediaId });
  await product.save();
}

// ---------------------------------------------------------------
// Embedded long-form details
// ---------------------------------------------------------------

async function upsertDetails(productId, data) {
  const set = {};
  const DETAIL_FIELDS = [
    "story",
    "ingredients",
    "howToUse",
    "warnings",
    "longevity",
    "projection",
    "sillage",
    "season",
    "occasion",
    "topNotes",
    "middleNotes",
    "baseNotes",
    "authenticityInfo",
    "packagingInfo",
    "shippingInfo",
    "returnsInfo",
    "faqs",
  ];
  for (const key of DETAIL_FIELDS) {
    if (data[key] !== undefined) set[`details.${key}`] = data[key];
  }
  if (Object.keys(set).length === 0) return;
  await Product.updateOne({ _id: productId }, { $set: set });
}

// ---------------------------------------------------------------
// Gift pack contents (Section 25 - bundles referencing other products)
// ---------------------------------------------------------------

async function setGiftPackItems(productId, items) {
  const giftPackItems = (items || []).map((item, index) => ({
    includedProductId: item.includedProductId,
    includedVariantId: item.includedVariantId || null,
    quantity: item.quantity || 1,
    displayOrder: index,
  }));
  await Product.updateOne({ _id: productId }, { $set: { giftPackItems } });
}

/** Populates included products' display info for the public PDP. */
async function getGiftPackContents(productId) {
  const product = await Product.findById(productId)
    .select("giftPackItems")
    .populate({
      path: "giftPackItems.includedProductId",
      select: "name slug primaryMediaUrl price salePrice variants hasVariants",
    });
  if (!product) return [];
  return product.giftPackItems
    .filter((item) => item.includedProductId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item) => {
      const included = item.includedProductId.toJSON
        ? item.includedProductId.toJSON()
        : item.includedProductId;
      const variant = item.includedVariantId
        ? (included.variants || []).find(
            (v) => v.id === item.includedVariantId.toString(),
          )
        : null;
      return {
        productId: included.id,
        name: included.name,
        slug: included.slug,
        imageUrl: included.primaryMediaUrl,
        variantLabel: variant ? variant.label : null,
        quantity: item.quantity,
      };
    });
}

module.exports = {
  list,
  getFullById,
  getFullBySlug,
  slugExists,
  skuExists,
  variantSkuExists,
  create,
  update,
  patchStatus,
  incrementViews,
  getPurchasesLast24h,
  hardDelete,
  getRelated,
  setRelated,
  addVariant,
  updateVariant,
  removeVariant,
  addMedia,
  updateMedia,
  reorderMedia,
  removeMedia,
  upsertDetails,
  setGiftPackItems,
  getGiftPackContents,
  computeEffectivePrice,
};
