/**
 * src/models/orderModel.js
 *
 * Order placement runs inside a MongoDB session/transaction (Atlas
 * clusters are replica sets, so multi-document transactions are
 * available) because it touches three things that must all succeed
 * or all roll back together: decrementing stock on each purchased
 * variant, creating the Order document, and clearing the cart. A
 * partial success here (e.g. stock decremented but the order never
 * created) would be a real inventory bug, not just a display glitch.
 *
 * Stock is decremented with a conditional filter
 * (`"variants.stock": { $gte: quantity }`) rather than a plain
 * `$inc`, so two customers racing for the last unit can't both
 * succeed - the second one's update matches zero documents and the
 * whole transaction aborts with a clear "out of stock" error instead
 * of silently selling stock that doesn't exist.
 */
const mongoose = require("mongoose");
const Order = require("./Order");
const Cart = require("./Cart");
const Product = require("./Product");
const { nextSequence } = require("./Counter");

const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD || 100,
);
const FLAT_SHIPPING_COST = Number(process.env.FLAT_SHIPPING_COST || 10);

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function createOrderFromCart(userId, shippingAddress) {
  const session = await mongoose.startSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart || cart.items.length === 0) {
        throw Object.assign(new Error("Your cart is empty."), { status: 400 });
      }

      const productIds = [
        ...new Set(cart.items.map((i) => i.productId.toString())),
      ];
      const products = await Product.find({ _id: { $in: productIds } }).session(
        session,
      );
      const productMap = new Map(products.map((p) => [p.id, p]));

      const orderItems = [];

      for (const item of cart.items) {
        const product = productMap.get(item.productId.toString());
        if (!product || product.status !== "published" || !product.isVisible) {
          throw Object.assign(
            new Error(
              `An item in your cart is no longer available. Please review your cart.`,
            ),
            { status: 409 },
          );
        }

        let unitPrice;
        let sku;
        let variantId = null;
        let variantLabel = null;

        if (product.hasVariants) {
          const variant = product.variants.id(item.variantId);
          if (!variant || !variant.isVisible) {
            throw Object.assign(
              new Error(`${product.name} is no longer available in that size.`),
              {
                status: 409,
              },
            );
          }
          const result = await Product.updateOne(
            {
              _id: product._id,
              "variants._id": variant._id,
              "variants.stock": { $gte: item.quantity },
            },
            {
              $inc: {
                "variants.$.stock": -item.quantity,
                salesCount: item.quantity,
              },
            },
            { session },
          );
          if (result.matchedCount === 0) {
            throw Object.assign(
              new Error(
                `Only limited stock remains for ${product.name} (${variant.label}). Please adjust the quantity in your cart.`,
              ),
              { status: 409 },
            );
          }
          unitPrice = variant.salePrice ?? variant.price;
          sku = variant.sku;
          variantId = variant._id;
          variantLabel = variant.label;
        } else {
          unitPrice = product.salePrice ?? product.price;
          sku = product.sku;
          await Product.updateOne(
            { _id: product._id },
            { $inc: { salesCount: item.quantity } },
            { session },
          );
        }

        const lineTotal = round2(unitPrice * item.quantity);
        orderItems.push({
          productId: product._id,
          productName: product.name,
          productSlug: product.slug,
          imageUrl: product.primaryMediaUrl,
          variantId,
          variantLabel,
          sku,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }

      const subtotal = round2(
        orderItems.reduce((sum, i) => sum + i.lineTotal, 0),
      );

      const shippingCost =
        subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
      const tax = 0; // no tax engine yet - lands with the Settings/Taxes module
      const total = round2(subtotal + shippingCost + tax);

      const seq = await nextSequence("orderNumber", { start: 10000 });
      const orderNumber = `SCNT${seq}`;

      const [order] = await Order.create(
        [
          {
            orderNumber,
            userId,
            items: orderItems,
            shippingAddress,
            subtotal,
            shippingCost,
            tax,
            total,
            status: "pending",
            statusHistory: [{ status: "pending", changedAt: new Date() }],
          },
        ],
        { session },
      );

      cart.items = [];
      await cart.save({ session });

      createdOrder = order;
    });
  } finally {
    session.endSession();
  }

  return createdOrder.toJSON();
}

async function listByUser(userId, { limit = 20, offset = 0 } = {}) {
  const [rows, total] = await Promise.all([
    Order.find({ userId }).sort({ createdAt: -1 }).skip(offset).limit(limit),
    Order.countDocuments({ userId }),
  ]);
  return { rows, total };
}

async function getByIdForUser(orderId, userId) {
  return Order.findOne({ _id: orderId, userId });
}

async function listAdmin({ status, search, limit = 20, offset = 0 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "shippingAddress.firstName": { $regex: search, $options: "i" } },
      { "shippingAddress.lastName": { $regex: search, $options: "i" } },
      { "shippingAddress.email": { $regex: search, $options: "i" } },
    ];
  }
  const [rows, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { rows, total };
}

async function getByIdAdmin(orderId) {
  return Order.findById(orderId);
}

async function updateStatus(orderId, status, adminUserId, extra = {}) {
  const order = await Order.findById(orderId);
  if (!order) return null;
  order.status = status;
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: adminUserId || null,
  });
  if (extra.trackingNumber !== undefined)
    order.trackingNumber = extra.trackingNumber;
  if (extra.courierCompany !== undefined)
    order.courierCompany = extra.courierCompany;
  if (extra.internalNotes !== undefined)
    order.internalNotes = extra.internalNotes;
  if (status === "delivered" && order.paymentMethod === "cod")
    order.paymentStatus = "paid";
  await order.save();
  return order;
}

module.exports = {
  createOrderFromCart,
  listByUser,
  getByIdForUser,
  listAdmin,
  getByIdAdmin,
  updateStatus,
};
