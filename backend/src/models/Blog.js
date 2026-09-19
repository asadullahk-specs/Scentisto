/**
 * src/models/Blog.js
 *
 * A blog post is deliberately its own top-level entity, not a
 * "content" flavor bolted onto Product - it has none of Product's
 * variants/stock/pricing shape and needs its own status lifecycle
 * (draft/published) and publish timestamp. `featuredImageUrl` reuses
 * the same Google Drive media handling (`utils/media.js`) already
 * built for product/homepage media rather than inventing a second
 * media pipeline.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const BLOG_STATUSES = ["draft", "published"];

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 220,
    },
    excerpt: { type: String, default: null, maxlength: 500 },
    content: { type: String, required: true }, // admin-authored HTML/markdown body

    featuredImageUrl: { type: String, default: null },
    tags: { type: [String], default: [] },

    authorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: "draft",
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    viewsCount: { type: Number, default: 0 },

    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
  },
  { timestamps: true, ...withId },
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });

module.exports = model("Blog", blogSchema);
module.exports.BLOG_STATUSES = BLOG_STATUSES;
