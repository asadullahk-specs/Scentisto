/**
 * src/models/HomepageSection.js
 *
 * One document per homepage section (Section 26 of the CMS spec).
 * `content` is intentionally schemaless (Mixed) - a hero section's
 * content shape (heading/subheading/image/buttons) has nothing in
 * common with a featured-products section's (a list of product
 * ids), and forcing every section type through one rigid schema
 * would mean a new migration every time a section type gains a
 * field. The `type` enum is what the frontend renderer switches on
 * to know how to interpret `content`.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const SECTION_TYPES = [
  "hero",
  "offer_banner",
  "featured_products",
  "collections",
  "brand_story",
  "instagram_feed",
  "testimonials",
];

const homepageSectionSchema = new Schema(
  {
    type: { type: String, enum: SECTION_TYPES, required: true },
    title: { type: String, required: true }, // admin-facing label, e.g. "Hero Section"
    content: { type: Schema.Types.Mixed, default: {} },
    displayOrder: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, ...withId },
);

homepageSectionSchema.index({ displayOrder: 1 });

module.exports = model("HomepageSection", homepageSectionSchema);
module.exports.SECTION_TYPES = SECTION_TYPES;
