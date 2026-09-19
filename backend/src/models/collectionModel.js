/**
 * src/models/collectionModel.js
 * Thin wrapper around the Collection Mongoose model. Product <->
 * Collection membership now lives as an array of ObjectIds
 * (collectionIds) directly on the Product document instead of a
 * join table - see productModel.js.
 */
const Collection = require("./Collection");
const Product = require("./Product");

async function listAll({ onlyVisible = false } = {}) {
  const filter = onlyVisible ? { isVisible: true } : {};
  return Collection.find(filter).sort({ displayOrder: 1, name: 1 });
}

async function getBySlug(slug) {
  return Collection.findOne({ slug });
}

async function getById(id) {
  return Collection.findById(id);
}

async function create(data) {
  const collection = await Collection.create({
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    displayOrder: data.displayOrder || 0,
    isFeatured: Boolean(data.isFeatured),
    isVisible: data.isVisible !== undefined ? Boolean(data.isVisible) : true,
  });
  return collection.id;
}

const UPDATABLE_FIELDS = [
  "name",
  "slug",
  "description",
  "imageUrl",
  "displayOrder",
  "isFeatured",
  "isVisible",
];

async function update(id, data) {
  const set = {};
  for (const field of UPDATABLE_FIELDS) {
    if (data[field] !== undefined) set[field] = data[field];
  }
  if (Object.keys(set).length === 0) return;
  await Collection.updateOne({ _id: id }, { $set: set });
}

async function remove(id) {
  await Collection.deleteOne({ _id: id });
  await Product.updateMany(
    { collectionIds: id },
    { $pull: { collectionIds: id } },
  );
}

async function setProductCollections(productId, collectionIds) {
  await Product.updateOne(
    { _id: productId },
    { $set: { collectionIds: collectionIds || [] } },
  );
}

async function getProductCollections(productId) {
  const product = await Product.findById(productId)
    .select("collectionIds")
    .populate("collectionIds");
  return product ? product.collectionIds : [];
}

module.exports = {
  listAll,
  getBySlug,
  getById,
  create,
  update,
  remove,
  setProductCollections,
  getProductCollections,
};
