const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const categorySchema = new Schema(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 160,
    },
    description: { type: String, default: null },
    imageUrl: { type: String, default: null },
    bannerUrl: { type: String, default: null },
    displayOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
  },
  { timestamps: true, ...withId },
);

module.exports = model("Category", categorySchema);
