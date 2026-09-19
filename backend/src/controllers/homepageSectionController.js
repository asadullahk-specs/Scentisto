const homepageSectionModel = require("../models/homepageSectionModel");
const Product = require("../models/Product");
const Collection = require("../models/Collection");
const Review = require("../models/Review");
const productModel = require("../models/productModel");

const FLAG_FIELDS = new Set([
  "isFeatured",
  "isTopSelling",
  "isBestSeller",
  "isTrending",
  "isLimitedEdition",
  "isNewArrival",
  "isFlashSale",
  "showOnHomepage",
]);

/**
 * Resolves a section's `content` into real data for the storefront.
 * Every section type is either passthrough copy (hero, offer_banner,
 * brand_story, newsletter, instagram_feed - the Admin's exact text/
 * images, nothing to look up) or a reference the Admin curated
 * (specific product/collection ids) with an "auto" fallback so the
 * homepage isn't blank just because nobody picked products yet.
 */
async function resolveSection(section) {
  const content = section.content || {};

  if (section.type === "featured_products") {
    const limit = content.limit || 8;
    let products;
    if (
      content.sourceType === "manual" &&
      Array.isArray(content.productIds) &&
      content.productIds.length > 0
    ) {
      const docs = await Product.find({
        _id: { $in: content.productIds },
        status: "published",
        isVisible: true,
      });
      const byId = new Map(docs.map((d) => [d.id, d]));
      products = content.productIds.map((id) => byId.get(id)).filter(Boolean);
    } else {
      const flag = FLAG_FIELDS.has(content.flag) ? content.flag : "isFeatured";
      const { rows } = await productModel.list(
        { [toQueryFlag(flag)]: true, sortBy: "newest" },
        { isAdmin: false, limit, offset: 0 },
      );
      return { ...section.toJSON(), resolved: { products: rows } };
    }
    return {
      ...section.toJSON(),
      resolved: {
        products: products.map((p) => {
          const obj = p.toJSON();
          obj.effectivePrice = productModel.computeEffectivePrice(obj);
          return obj;
        }),
      },
    };
  }

  if (section.type === "collections") {
    const collectionIds = content.collectionIds || [];
    const collections = collectionIds.length
      ? await Collection.find({ _id: { $in: collectionIds }, isVisible: true })
      : await Collection.find({ isVisible: true, isFeatured: true }).limit(
          content.limit || 4,
        );
    return { ...section.toJSON(), resolved: { collections } };
  }

  if (section.type === "testimonials") {
    const reviews = await Review.find({ status: "approved" })
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(content.limit || 6)
      .populate("productId", "name slug");
    return { ...section.toJSON(), resolved: { reviews } };
  }

  // hero, offer_banner, brand_story, newsletter, instagram_feed - passthrough.
  return { ...section.toJSON(), resolved: null };
}

/** Maps a schema boolean field name to the query-param name productModel.list's filters expect. */
function toQueryFlag(field) {
  const map = {
    isFeatured: "isFeatured",
    isTopSelling: "isTopSelling",
    isBestSeller: "isBestSeller",
    isTrending: "isTrending",
    isLimitedEdition: "isLimitedEdition",
    isNewArrival: "isNewArrival",
    isFlashSale: "isFlashSale",
    showOnHomepage: "showOnHomepage",
  };
  return map[field] || "isFeatured";
}

// ---------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------

async function listPublic(req, res) {
  const sections = await homepageSectionModel.listPublic();
  const resolved = await Promise.all(sections.map(resolveSection));
  res.json({ sections: resolved });
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

async function listAdmin(req, res) {
  const sections = await homepageSectionModel.listAdmin();
  res.json({ sections });
}

async function createAdmin(req, res) {
  const id = await homepageSectionModel.create(req.body);
  const section = await homepageSectionModel.getById(id);
  res.status(201).json({ section });
}

async function updateAdmin(req, res) {
  const existing = await homepageSectionModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Section not found." });
  await homepageSectionModel.update(req.params.id, req.body);
  const section = await homepageSectionModel.getById(req.params.id);
  res.json({ section });
}

async function reorderAdmin(req, res) {
  await homepageSectionModel.reorder(req.body.orderedIds || []);
  const sections = await homepageSectionModel.listAdmin();
  res.json({ sections });
}

async function removeAdmin(req, res) {
  const existing = await homepageSectionModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Section not found." });
  await homepageSectionModel.remove(req.params.id);
  res.json({ message: "Section deleted." });
}

module.exports = {
  listPublic,
  listAdmin,
  createAdmin,
  updateAdmin,
  reorderAdmin,
  removeAdmin,
};
