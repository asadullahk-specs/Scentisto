/**
 * src/models/blogModel.js
 * Thin wrapper around the Blog Mongoose model, matching the shape of
 * categoryModel.js - list/get/create/update/remove, plus the
 * published-vs-all split every other content type in this app has.
 */
const Blog = require("./Blog");

const LIST_PROJECTION = "-content"; // list views never need the full body

async function slugExists(slug, excludeId = null) {
  const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
  return Boolean(await Blog.exists(filter));
}

async function getById(id) {
  return Blog.findById(id).populate("authorId", "firstName lastName");
}

async function getBySlugPublic(slug) {
  return Blog.findOne({ slug, status: "published" }).populate(
    "authorId",
    "firstName lastName",
  );
}

async function incrementViews(id) {
  await Blog.updateOne({ _id: id }, { $inc: { viewsCount: 1 } });
}

async function listPublic({ tag, search, limit = 12, offset = 0 } = {}) {
  const filter = { status: "published" };
  if (tag) filter.tags = tag;
  if (search) filter.title = { $regex: search, $options: "i" };
  const [rows, total] = await Promise.all([
    Blog.find(filter)
      .select(LIST_PROJECTION)
      .sort({ publishedAt: -1 })
      .skip(offset)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);
  return { rows, total };
}

async function listAdmin({ status, search, limit = 20, offset = 0 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: "i" };
  const [rows, total] = await Promise.all([
    Blog.find(filter)
      .select(LIST_PROJECTION)
      .populate("authorId", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);
  return { rows, total };
}

async function create(data) {
  const blog = await Blog.create({
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt || null,
    content: data.content,
    featuredImageUrl: data.featuredImageUrl || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    authorId: data.authorId || null,
    status: data.status === "published" ? "published" : "draft",
    isFeatured: Boolean(data.isFeatured),
    publishedAt: data.status === "published" ? new Date() : null,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
  });
  return blog.id;
}

const UPDATABLE_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "content",
  "featuredImageUrl",
  "tags",
  "isFeatured",
  "metaTitle",
  "metaDescription",
];

async function update(id, data) {
  const set = {};
  for (const field of UPDATABLE_FIELDS) {
    if (data[field] !== undefined) set[field] = data[field];
  }

  // publishedAt is set once, the first time a post goes live - later
  // draft<->published toggles don't reset it, so "published on" always
  // reflects when it first went public, not the last status flip.
  if (data.status !== undefined) {
    set.status = data.status;
    if (data.status === "published") {
      const existing = await Blog.findById(id).select("publishedAt");
      if (existing && !existing.publishedAt) set.publishedAt = new Date();
    }
  }

  if (Object.keys(set).length === 0) return;
  await Blog.updateOne({ _id: id }, { $set: set });
}

async function remove(id) {
  await Blog.deleteOne({ _id: id });
}

module.exports = {
  slugExists,
  getById,
  getBySlugPublic,
  incrementViews,
  listPublic,
  listAdmin,
  create,
  update,
  remove,
};
