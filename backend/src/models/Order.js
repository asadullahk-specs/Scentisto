/**
 * src/models/Order.js
 *
 * Every line item snapshots the product name, variant label, SKU,
 * unit price, and image at the moment of purchase. This is
 * deliberate: if the product is later renamed, repriced, or even
 * deleted, a past order must still show exactly what the customer
 * actually bought and paid - it should never silently change.
 *
 * Payment is Cash on Delivery only in this phase (matches the
 * reference checkout design) - card/wallet gateways are a Settings
 * → Payments integration for a later phase, not something to fake
 * here.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "failed_payment",
];

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    imageUrl: { type: String, default: null },
    variantId: { type: Schema.Types.ObjectId, default: null },
    variantLabel: { type: String, default: null },
    sku: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true }, // complete address - no separate ZIP/apartment field, per spec
    notes: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => v.length > 0,
    },
    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    internalNotes: { type: String, default: null },

    trackingNumber: { type: String, default: null },
    courierCompany: { type: String, default: null },
  },
  { timestamps: true, ...withId },
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
