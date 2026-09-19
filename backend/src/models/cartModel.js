/**
 * src/models/cartModel.js
 */
const Cart = require("./Cart");
const Product = require("./Product");

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
}

function findVariant(product, variantId) {
  if (!variantId) return null;
  return product.variants.id(variantId);
}

/**
 * Returns the cart with every line enriched against LIVE product/
 * variant data (name, image, current price, stock) - never against
 * anything cached on the cart item itself. Items whose product or
 * variant no longer exists/is no longer published are dropped and
 * the cleanup is persisted, so a stale cart self-heals on next view
 * instead of silently showing a broken line forever.
 */
async function getEnriched(userId) {
  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) {
    return { cartId: cart.id, items: [], subtotal: 0, itemCount: 0 };
  }

  const productIds = [
    ...new Set(cart.items.map((i) => i.productId.toString())),
  ];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const enriched = [];
  const validItems = [];

  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());
    if (!product || product.status !== "published" || !product.isVisible)
      continue;

    const variant = product.hasVariants
      ? findVariant(product, item.variantId)
      : null;
    if (product.hasVariants && !variant) continue; // variant was deleted - drop the line

    const unitPrice = variant
      ? (variant.salePrice ?? variant.price)
      : (product.salePrice ?? product.price);
    const availableStock = variant
      ? variant.stock - variant.reservedStock
      : null; // null = not variant-tracked
    const inStock = availableStock === null || availableStock > 0;
    const quantity =
      availableStock !== null
        ? Math.min(item.quantity, Math.max(availableStock, 0))
        : item.quantity;

    validItems.push(item);
    enriched.push({
      itemId: item.id,
      productId: product.id,
      categoryId: product.categoryId ? product.categoryId.toString() : null,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.primaryMediaUrl,
      variantId: variant ? variant.id : null,
      variantLabel: variant ? variant.label : null,
      sku: variant ? variant.sku : product.sku,
      unitPrice,
      quantity,
      quantityCapped: quantity !== item.quantity,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
      inStock,
      availableStock,
    });
  }

  // Persist self-healing cleanup if any lines were dropped.
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  const subtotal =
    Math.round(enriched.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
  const itemCount = enriched.reduce((sum, i) => sum + i.quantity, 0);

  return { cartId: cart.id, items: enriched, subtotal, itemCount };
}

async function addItem(userId, { productId, variantId, quantity = 1 }) {
  const product = await Product.findOne({
    _id: productId,
    status: "published",
    isVisible: true,
  });
  if (!product) {
    const err = new Error("Product not found or unavailable.");
    err.status = 404;
    throw err;
  }
  if (product.hasVariants) {
    const variant = findVariant(product, variantId);
    if (!variant || !variant.isVisible) {
      const err = new Error("This size is not available.");
      err.status = 404;
      throw err;
    }
  }

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find(
    (i) =>
      i.productId.toString() === productId &&
      String(i.variantId || "") === String(variantId || ""),
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, variantId: variantId || null, quantity });
  }
  await cart.save();
  return getEnriched(userId);
}

async function updateItemQuantity(userId, itemId, quantity) {
  const cart = await getOrCreateCart(userId);
  if (quantity <= 0) {
    cart.items.pull({ _id: itemId });
  } else {
    const item = cart.items.id(itemId);
    if (!item) {
      const err = new Error("Cart item not found.");
      err.status = 404;
      throw err;
    }
    item.quantity = quantity;
  }
  await cart.save();
  return getEnriched(userId);
}

async function removeItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);
  cart.items.pull({ _id: itemId });
  await cart.save();
  return getEnriched(userId);
}

/** Called right after a guest with local-only cart items logs in. */
async function mergeItems(userId, guestItems = []) {
  for (const item of guestItems) {
    if (!item.productId || !item.quantity) continue;
    try {
      await addItem(userId, {
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      });
    } catch {
      // A guest-cart line that's no longer valid (deleted/unpublished) is
      // silently skipped rather than blocking the whole merge.
    }
  }
  return getEnriched(userId);
}

async function clearCart(userId) {
  await Cart.updateOne({ userId }, { $set: { items: [] } });
}

module.exports = {
  getOrCreateCart,
  getEnriched,
  addItem,
  updateItemQuantity,
  removeItem,
  mergeItems,
  clearCart,
};
