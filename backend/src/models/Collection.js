const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const collectionSchema = new Schema(
  {
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
    displayOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true, ...withId },
);

module.exports = model("Collection", collectionSchema);
