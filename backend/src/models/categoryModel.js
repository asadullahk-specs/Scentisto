/**
 * src/models/categoryModel.js
 * Thin wrapper around the Category Mongoose model.
 */
const Category = require("./Category");

async function listAll({ onlyVisible = false } = {}) {
  const filter = onlyVisible ? { isVisible: true } : {};
  return Category.find(filter).sort({ displayOrder: 1, name: 1 });
}

/** Builds a nested parent -> children tree from the flat doc list. */
function buildTree(rows) {
  const plain = rows.map((r) => (r.toObject ? r.toObject() : r));
  const byId = new Map(plain.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const row of byId.values()) {
    if (row.parentId && byId.has(row.parentId.toString())) {
      byId.get(row.parentId.toString()).children.push(row);
    } else {
      roots.push(row);
    }
  }
  return roots;
}

async function getBySlug(slug) {
  return Category.findOne({ slug });
}

async function getById(id) {
  return Category.findById(id);
}

async function slugExists(slug, excludeId = null) {
  const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
  return Boolean(await Category.exists(filter));
}

async function create(data) {
  const category = await Category.create({
    parentId: data.parentId || null,
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    bannerUrl: data.bannerUrl || null,
    displayOrder: data.displayOrder || 0,
    isFeatured: Boolean(data.isFeatured),
    isVisible: data.isVisible !== undefined ? Boolean(data.isVisible) : true,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
  });
  return category.id;
}

const UPDATABLE_FIELDS = [
  "parentId",
  "name",
  "slug",
  "description",
  "imageUrl",
  "bannerUrl",
  "displayOrder",
  "isFeatured",
  "isVisible",
  "metaTitle",
  "metaDescription",
];

async function update(id, data) {
  const set = {};
  for (const field of UPDATABLE_FIELDS) {
    if (data[field] !== undefined) set[field] = data[field];
  }
  if (Object.keys(set).length === 0) return;
  await Category.updateOne({ _id: id }, { $set: set });
}

async function remove(id) {
  await Category.deleteOne({ _id: id });
}

module.exports = {
  listAll,
  buildTree,
  getBySlug,
  getById,
  slugExists,
  create,
  update,
  remove,
};
