const collectionModel = require("../models/collectionModel");
const { slugify } = require("../utils/media");

async function listPublic(req, res) {
  const collections = await collectionModel.listAll({ onlyVisible: true });
  res.json({ collections });
}

async function listAdmin(req, res) {
  const collections = await collectionModel.listAll({ onlyVisible: false });
  res.json({ collections });
}

async function createAdmin(req, res) {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.name);
  const id = await collectionModel.create({ ...req.body, slug });
  const collection = await collectionModel.getById(id);
  res.status(201).json({ collection });
}

async function updateAdmin(req, res) {
  const existing = await collectionModel.getById(req.params.id);
  if (!existing)
    return res.status(404).json({ error: "Collection not found." });
  const data = { ...req.body };
  if (data.slug) data.slug = slugify(data.slug);
  await collectionModel.update(req.params.id, data);
  const collection = await collectionModel.getById(req.params.id);
  res.json({ collection });
}

async function removeAdmin(req, res) {
  const existing = await collectionModel.getById(req.params.id);
  if (!existing)
    return res.status(404).json({ error: "Collection not found." });
  await collectionModel.remove(req.params.id);
  res.json({ message: "Collection deleted." });
}

module.exports = {
  listPublic,
  listAdmin,
  createAdmin,
  updateAdmin,
  removeAdmin,
};
