/**
 * src/models/Review.js
 *
 * Validation rules from Section 23/31 of the CMS spec are enforced
 * server-side in reviewModel.js, not just in the frontend form:
 * - without an image: reviewText >= 150 characters
 * - with an image: reviewText >= 80 characters
 * (kept consistent review-card sizing is the spec's stated reason).
 * A review only appears on the storefront once an Admin approves it
 * - `status` starts at "pending" and public queries always filter
 * to "approved".
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const reviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    customerName: { type: String, required: true }, // snapshotted at submission time

    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true, maxlength: 3000 },
    images: { type: [String], default: [] }, // Google Drive links, same convention as product media

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    adminReply: { type: String, default: null },

    reportedCount: { type: Number, default: 0 },
  },
  { timestamps: true, ...withId },
);

reviewSchema.index({ productId: 1, status: 1 });

module.exports = model("Review", reviewSchema);
