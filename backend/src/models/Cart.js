/**
 * src/models/Cart.js
 *
 * Deliberately thin: a cart item only stores productId + variantId +
 * quantity. Price/availability are always read live from the Product
 * document when the cart is fetched (see cartModel.getEnriched), so
 * a price change or a product going out of stock is reflected
 * immediately instead of the cart showing stale numbers. Prices are
 * only ever snapshotted onto an Order at the moment of purchase
 * (models/Order.js) - that snapshot is what should never change
 * retroactively; the cart itself should always show the truth.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, default: null }, // subdocument id within that product's variants[]
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true, ...withId },
);

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true, ...withId },
);

module.exports = model("Cart", cartSchema);
