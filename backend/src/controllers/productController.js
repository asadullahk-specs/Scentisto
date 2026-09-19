/**
 * src/controllers/productController.js
 *
 * NOTE ON FIELD NAMING: the previous MySQL-backed version returned
 * snake_case column names straight from SQL (category_id,
 * primary_media_type, has_variants...). MongoDB/Mongoose has no such
 * constraint, so every field below is camelCase end-to-end - schema,
 * API responses, and the frontend all agree. If you're comparing
 * against the old response shapes, that's the one systematic change
 * beyond the storage engine swap itself.
 */
const productModel = require("../models/productModel");
const collectionModel = require("../models/collectionModel");
const mediaLibraryModel = require("../models/productMediaModel");
const userModel = require("../models/userModel");
const presenceTracker = require("../utils/presenceTracker");
const { parsePagination, buildMeta } = require("../utils/pagination");
const {
  slugify,
  resolveMediaType,
  toEmbeddableUrl,
  isValidHttpUrl,
} = require("../utils/media");

function parseListFilters(query) {
  return {
    type: query.type || undefined,
    categorySlug: query.category || undefined,
    categoryId: query.categoryId || undefined,
    brand: query.brand || undefined,
    gender: query.gender || undefined,
    fragranceFamily: query.fragranceFamily || undefined,
    collectionSlug: query.collection || undefined,
    sizeMl: query.ml ? Number(query.ml) : undefined,
    inStockOnly: query.inStock === "true",
    isFeatured: query.featured === "true",
    isTopSelling: query.topSelling === "true",
    isBestSeller: query.bestSeller === "true",
    isTrending: query.trending === "true",
    isLimitedEdition: query.limitedEdition === "true",
    isNewArrival: query.newArrival === "true",
    isFlashSale: query.flashSale === "true",
    showOnHomepage: query.homepage === "true",
    minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
    search: query.search || undefined,
    sortBy: query.sortBy || "newest",
    status: query.status || undefined, // admin only, ignored for public
  };
}

// ---------------------------------------------------------------
// PUBLIC (storefront)
// ---------------------------------------------------------------

async function listPublic(req, res) {
  const filters = parseListFilters(req.query);
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await productModel.list(filters, {
    isAdmin: false,
    limit,
    offset,
  });
  res.json({ products: rows, meta: buildMeta({ page, perPage, total }) });
}

async function getPublicBySlug(req, res) {
  const product = await productModel.getFullBySlug(req.params.slug, {
    isAdmin: false,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });

  const [
    collections,
    frequentlyBoughtTogether,
    recommended,
    giftPackContents,
    purchasesLast24h,
  ] = await Promise.all([
    collectionModel.getProductCollections(product.id),
    productModel.getRelated(product.id, "frequently_bought_together"),
    productModel.getRelated(product.id, "recommended"),
    product.type === "gift_pack"
      ? productModel.getGiftPackContents(product.id)
      : Promise.resolve([]),
    productModel.getPurchasesLast24h(product.id),
  ]);

  productModel.incrementViews(product.id).catch(() => {}); // best-effort, never block the response

  res.json({
    product,
    variants: (product.variants || []).filter((v) => v.isVisible),
    media: product.media || [],
    details: product.details || null,
    collections,
    related: { frequentlyBoughtTogether, recommended },
    giftPackContents,
    // Live "N people viewing this right now" starts at whatever this
    // visitor's own heartbeat reports - the frontend fires one on
    // mount immediately after this response, so the very first
    // render already includes them rather than showing 0 for a beat.
    viewersNow: presenceTracker.countActive(product.id),
    purchasesLast24h,
  });
}

// A lightweight heartbeat the PDP calls on mount and every ~20s while
// the visitor stays on the page, keeping them counted in
// viewersNow. Intentionally has no auth requirement - it's a public
// page's own marketing signal, not a security-relevant action, and
// carries no data beyond an ephemeral client-generated session id.
async function heartbeatPresence(req, res) {
  const product = await productModel.getFullBySlug(req.params.slug, {
    isAdmin: false,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  const sessionId = String(req.body.sessionId || "").slice(0, 100);
  if (!sessionId)
    return res.status(422).json({ error: "sessionId is required." });
  const viewers = presenceTracker.heartbeat(product.id, sessionId);
  res.json({ viewers });
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

async function listAdmin(req, res) {
  const filters = parseListFilters(req.query);
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await productModel.list(filters, {
    isAdmin: true,
    limit,
    offset,
  });
  res.json({ products: rows, meta: buildMeta({ page, perPage, total }) });
}

async function getAdminById(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });

  const [collections, giftPackContents] = await Promise.all([
    collectionModel.getProductCollections(product.id),
    product.type === "gift_pack"
      ? productModel.getGiftPackContents(product.id)
      : Promise.resolve([]),
  ]);

  res.json({
    product,
    variants: product.variants || [],
    media: product.media || [],
    details: product.details || null,
    collections,
    giftPackContents,
  });
}

async function createAdmin(req, res) {
  const body = req.body;
  const slug = slugify(body.slug || body.name);

  if (await productModel.slugExists(slug)) {
    return res
      .status(409)
      .json({ error: "A product with this slug already exists." });
  }
  if (await productModel.skuExists(body.sku)) {
    return res
      .status(409)
      .json({ error: "A product with this SKU already exists." });
  }
  if (body.primaryMediaUrl && !isValidHttpUrl(body.primaryMediaUrl)) {
    return res
      .status(422)
      .json({ error: "Primary media URL is not a valid link." });
  }

  let primaryMediaType = body.primaryMediaType || "auto";
  if (body.primaryMediaUrl) {
    const resolved = await resolveMediaType(
      body.primaryMediaUrl,
      body.primaryMediaType,
    );
    primaryMediaType = resolved.type;
  }

  const productId = await productModel.create(
    { ...body, slug, primaryMediaType },
    req.user.sub,
  );

  if (Array.isArray(body.collectionIds)) {
    await collectionModel.setProductCollections(productId, body.collectionIds);
  }

  await userModel.logActivity({
    userId: req.user.sub,
    action: "product.create",
    ip: req.ip,
  });

  const product = await productModel.getFullById(productId, { isAdmin: true });
  res.status(201).json({ product });
}

async function updateAdmin(req, res) {
  const { id } = req.params;
  const existing = await productModel.getFullById(id, { isAdmin: true });
  if (!existing) return res.status(404).json({ error: "Product not found." });

  const body = req.body;
  const data = { ...body };

  if (body.slug) {
    data.slug = slugify(body.slug);
    if (await productModel.slugExists(data.slug, id)) {
      return res
        .status(409)
        .json({ error: "A product with this slug already exists." });
    }
  }
  if (body.sku && (await productModel.skuExists(body.sku, id))) {
    return res
      .status(409)
      .json({ error: "A product with this SKU already exists." });
  }
  if (body.primaryMediaUrl) {
    if (!isValidHttpUrl(body.primaryMediaUrl)) {
      return res
        .status(422)
        .json({ error: "Primary media URL is not a valid link." });
    }
    const resolved = await resolveMediaType(
      body.primaryMediaUrl,
      body.primaryMediaType,
    );
    data.primaryMediaType = resolved.type;
  }

  await productModel.update(id, data);

  if (Array.isArray(body.collectionIds)) {
    await collectionModel.setProductCollections(id, body.collectionIds);
  }

  await userModel.logActivity({
    userId: req.user.sub,
    action: "product.update",
    ip: req.ip,
  });

  const product = await productModel.getFullById(id, { isAdmin: true });
  res.json({ product });
}

async function patchStatusAdmin(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ["draft", "published", "unpublished", "archived"];
  if (!valid.includes(status)) {
    return res
      .status(422)
      .json({ error: `Status must be one of: ${valid.join(", ")}.` });
  }
  const existing = await productModel.getFullById(id, { isAdmin: true });
  if (!existing) return res.status(404).json({ error: "Product not found." });

  await productModel.patchStatus(id, status);
  await userModel.logActivity({
    userId: req.user.sub,
    action: `product.status.${status}`,
    ip: req.ip,
  });
  res.json({ message: `Product marked as ${status}.` });
}

async function removeAdmin(req, res) {
  const existing = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!existing) return res.status(404).json({ error: "Product not found." });
  await productModel.hardDelete(req.params.id);
  await userModel.logActivity({
    userId: req.user.sub,
    action: "product.delete",
    ip: req.ip,
  });
  res.json({ message: "Product deleted." });
}

async function duplicateAdmin(req, res) {
  const source = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!source) return res.status(404).json({ error: "Product not found." });

  const baseSlug = slugify(`${source.name}-copy`);
  let slug = baseSlug;
  let suffix = 1;
  while (await productModel.slugExists(slug)) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  const stamp = Date.now().toString().slice(-5);
  const sku = `${source.sku}-COPY-${stamp}`;

  const newId = await productModel.create(
    {
      type: source.type,
      name: `${source.name} (Copy)`,
      slug,
      brand: source.brand,
      categoryId: source.categoryId,
      sku,
      price: source.price,
      salePrice: source.salePrice,
      hasVariants: Boolean(source.hasVariants),
      gender: source.gender,
      fragranceFamily: source.fragranceFamily,
      primaryMediaType: source.primaryMediaType,
      primaryMediaUrl: source.primaryMediaUrl,
      hoverImageUrl: source.hoverImageUrl,
      status: "draft",
    },
    req.user.sub,
  );

  await Promise.all([
    ...(source.variants || []).map((v, i) =>
      productModel.addVariant(newId, {
        label: v.label,
        sizeMl: v.sizeMl,
        price: v.price,
        salePrice: v.salePrice,
        sku: `${v.sku}-COPY-${stamp}-${i}`,
        stock: 0,
        isDefault: Boolean(v.isDefault),
        isVisible: Boolean(v.isVisible),
        displayOrder: v.displayOrder,
      }),
    ),
    ...(source.media || []).map((m) =>
      productModel.addMedia(newId, {
        mediaType: m.mediaType,
        url: m.url,
        source: m.source,
        altText: m.altText,
        displayOrder: m.displayOrder,
      }),
    ),
    source.details
      ? productModel.upsertDetails(newId, source.details)
      : Promise.resolve(),
  ]);

  await userModel.logActivity({
    userId: req.user.sub,
    action: "product.duplicate",
    ip: req.ip,
  });

  const product = await productModel.getFullById(newId, { isAdmin: true });
  res.status(201).json({ product });
}

// ---------------------------------------------------------------
// ADMIN - variants (ML sizes)
// ---------------------------------------------------------------

async function listVariantsAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ variants: product.variants || [] });
}

async function createVariantAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  if (await productModel.variantSkuExists(req.body.sku)) {
    return res
      .status(409)
      .json({ error: "A variant with this SKU already exists." });
  }
  const variantId = await productModel.addVariant(product.id, req.body);
  const updated = await productModel.getFullById(product.id, { isAdmin: true });
  res.status(201).json({ variantId, variants: updated.variants });
}

async function updateVariantAdmin(req, res) {
  const { id, variantId } = req.params;
  if (
    req.body.sku &&
    (await productModel.variantSkuExists(req.body.sku, variantId))
  ) {
    return res
      .status(409)
      .json({ error: "A variant with this SKU already exists." });
  }
  await productModel.updateVariant(id, variantId, req.body);
  const updated = await productModel.getFullById(id, { isAdmin: true });
  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json({ variants: updated.variants });
}

async function removeVariantAdmin(req, res) {
  const { id, variantId } = req.params;
  await productModel.removeVariant(id, variantId);
  const updated = await productModel.getFullById(id, { isAdmin: true });
  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json({ variants: updated.variants });
}

// ---------------------------------------------------------------
// ADMIN - media gallery
// ---------------------------------------------------------------

async function listMediaAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ media: product.media || [] });
}

async function createMediaAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  if (!isValidHttpUrl(req.body.url)) {
    return res.status(422).json({ error: "Media URL is not a valid link." });
  }

  const resolved = await resolveMediaType(req.body.url, req.body.mediaType);
  const embeddableUrl = toEmbeddableUrl(req.body.url, resolved.type);

  const mediaId = await productModel.addMedia(product.id, {
    mediaType: resolved.type,
    url: embeddableUrl,
    altText: req.body.altText,
    displayOrder: req.body.displayOrder,
  });

  const updated = await productModel.getFullById(product.id, { isAdmin: true });
  res
    .status(201)
    .json({ mediaId, uncertainType: resolved.uncertain, media: updated.media });
}

async function updateMediaAdmin(req, res) {
  const { id, mediaId } = req.params;
  await productModel.updateMedia(id, mediaId, req.body);
  const updated = await productModel.getFullById(id, { isAdmin: true });
  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json({ media: updated.media });
}

async function reorderMediaAdmin(req, res) {
  const { id } = req.params;
  await productModel.reorderMedia(id, req.body.orderedIds || []);
  const updated = await productModel.getFullById(id, { isAdmin: true });
  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json({ media: updated.media });
}

async function removeMediaAdmin(req, res) {
  const { id, mediaId } = req.params;
  await productModel.removeMedia(id, mediaId);
  const updated = await productModel.getFullById(id, { isAdmin: true });
  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json({ media: updated.media });
}

// ---------------------------------------------------------------
// ADMIN - long-form details
// ---------------------------------------------------------------

async function getDetailsAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ details: product.details || null });
}

async function upsertDetailsAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  await productModel.upsertDetails(product.id, req.body);
  const updated = await productModel.getFullById(product.id, { isAdmin: true });
  res.json({ details: updated.details });
}

// ---------------------------------------------------------------
// ADMIN - related products
// ---------------------------------------------------------------

async function setRelatedAdmin(req, res) {
  const { relationType, relatedProductIds } = req.body;
  const valid = [
    "frequently_bought_together",
    "people_also_bought",
    "recommended",
    "bundle",
  ];
  if (!valid.includes(relationType)) {
    return res
      .status(422)
      .json({ error: `relationType must be one of: ${valid.join(", ")}.` });
  }
  await productModel.setRelated(
    req.params.id,
    relationType,
    relatedProductIds || [],
  );
  const related = await productModel.getRelated(req.params.id, relationType);
  res.json({ related });
}

// ---------------------------------------------------------------
// ADMIN - media library (aggregated view across all products)
// ---------------------------------------------------------------

async function listMediaLibraryAdmin(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await mediaLibraryModel.listAllAdmin({
    mediaType: req.query.type || undefined,
    search: req.query.search || undefined,
    limit,
    offset,
  });
  res.json({ media: rows, meta: buildMeta({ page, perPage, total }) });
}

// ---------------------------------------------------------------
// ADMIN - gift pack contents
// ---------------------------------------------------------------

async function setGiftPackItemsAdmin(req, res) {
  const product = await productModel.getFullById(req.params.id, {
    isAdmin: true,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });
  await productModel.setGiftPackItems(product.id, req.body.items || []);
  const contents = await productModel.getGiftPackContents(product.id);
  res.json({ giftPackContents: contents });
}

module.exports = {
  listPublic,
  getPublicBySlug,
  listAdmin,
  getAdminById,
  createAdmin,
  updateAdmin,
  patchStatusAdmin,
  removeAdmin,
  duplicateAdmin,
  listVariantsAdmin,
  createVariantAdmin,
  updateVariantAdmin,
  removeVariantAdmin,
  listMediaAdmin,
  createMediaAdmin,
  updateMediaAdmin,
  reorderMediaAdmin,
  removeMediaAdmin,
  getDetailsAdmin,
  upsertDetailsAdmin,
  setRelatedAdmin,
  listMediaLibraryAdmin,
  setGiftPackItemsAdmin,
  heartbeatPresence,
};
