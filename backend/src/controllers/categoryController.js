const categoryModel = require("../models/categoryModel");
const { slugify } = require("../utils/media");

async function listPublic(req, res) {
  const rows = await categoryModel.listAll({ onlyVisible: true });
  res.json({ categories: categoryModel.buildTree(rows) });
}

async function getPublicBySlug(req, res) {
  const category = await categoryModel.getBySlug(req.params.slug);
  if (!category || !category.isVisible) {
    return res.status(404).json({ error: "Category not found." });
  }
  res.json({ category });
}

async function listAdmin(req, res) {
  const rows = await categoryModel.listAll({ onlyVisible: false });
  res.json({ categories: categoryModel.buildTree(rows), flat: rows });
}

async function createAdmin(req, res) {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  if (await categoryModel.slugExists(slug)) {
    return res
      .status(409)
      .json({ error: "A category with this slug already exists." });
  }
  const id = await categoryModel.create({ ...req.body, slug });
  const category = await categoryModel.getById(id);
  res.status(201).json({ category });
}

async function updateAdmin(req, res) {
  const { id } = req.params;
  const existing = await categoryModel.getById(id);
  if (!existing) return res.status(404).json({ error: "Category not found." });

  const data = { ...req.body };
  if (data.slug) {
    data.slug = slugify(data.slug);
    if (await categoryModel.slugExists(data.slug, id)) {
      return res
        .status(409)
        .json({ error: "A category with this slug already exists." });
    }
  }
  await categoryModel.update(id, data);
  const category = await categoryModel.getById(id);
  res.json({ category });
}

async function removeAdmin(req, res) {
  const existing = await categoryModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Category not found." });
  await categoryModel.remove(req.params.id);
  res.json({ message: "Category deleted." });
}

module.exports = {
  listPublic,
  getPublicBySlug,
  listAdmin,
  createAdmin,
  updateAdmin,
  removeAdmin,
};
