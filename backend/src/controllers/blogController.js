const blogModel = require("../models/blogModel");
const userModel = require("../models/userModel");
const { slugify } = require("../utils/media");
const { parsePagination, buildMeta } = require("../utils/pagination");

// ---------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------

async function listPublic(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await blogModel.listPublic({
    tag: req.query.tag || undefined,
    search: req.query.search || undefined,
    limit,
    offset,
  });
  res.json({ blogs: rows, meta: buildMeta({ page, perPage, total }) });
}

async function getPublicBySlug(req, res) {
  const blog = await blogModel.getBySlugPublic(req.params.slug);
  if (!blog) return res.status(404).json({ error: "Blog post not found." });
  // Best-effort - a dropped view-count increment should never fail the page load.
  blogModel.incrementViews(blog.id).catch(() => {});
  res.json({ blog });
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

async function listAdmin(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await blogModel.listAdmin({
    status: req.query.status || undefined,
    search: req.query.search || undefined,
    limit,
    offset,
  });
  res.json({ blogs: rows, meta: buildMeta({ page, perPage, total }) });
}

async function getAdminById(req, res) {
  const blog = await blogModel.getById(req.params.id);
  if (!blog) return res.status(404).json({ error: "Blog post not found." });
  res.json({ blog });
}

async function createAdmin(req, res) {
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.title);
  if (await blogModel.slugExists(slug)) {
    return res
      .status(409)
      .json({ error: "A blog post with this slug already exists." });
  }
  const id = await blogModel.create({
    ...req.body,
    slug,
    authorId: req.user.sub,
  });
  const blog = await blogModel.getById(id);
  await userModel.logActivity({
    userId: req.user.sub,
    action: "blog.create",
    ip: req.ip,
    entityType: "Blog",
    entityId: id,
  });
  res.status(201).json({ blog });
}

async function updateAdmin(req, res) {
  const { id } = req.params;
  const existing = await blogModel.getById(id);
  if (!existing) return res.status(404).json({ error: "Blog post not found." });

  const data = { ...req.body };
  if (data.slug) {
    data.slug = slugify(data.slug);
    if (await blogModel.slugExists(data.slug, id)) {
      return res
        .status(409)
        .json({ error: "A blog post with this slug already exists." });
    }
  }
  await blogModel.update(id, data);
  const blog = await blogModel.getById(id);
  await userModel.logActivity({
    userId: req.user.sub,
    action: "blog.update",
    ip: req.ip,
    entityType: "Blog",
    entityId: id,
  });
  res.json({ blog });
}

async function setStatusAdmin(req, res) {
  const { status } = req.body;
  const existing = await blogModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Blog post not found." });
  await blogModel.update(req.params.id, { status });
  await userModel.logActivity({
    userId: req.user.sub,
    action: `blog.status.${status}`,
    ip: req.ip,
    entityType: "Blog",
    entityId: req.params.id,
  });
  res.json({ message: `Blog post marked as ${status}.` });
}

async function removeAdmin(req, res) {
  const existing = await blogModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Blog post not found." });
  await blogModel.remove(req.params.id);
  await userModel.logActivity({
    userId: req.user.sub,
    action: "blog.delete",
    ip: req.ip,
    entityType: "Blog",
    entityId: req.params.id,
  });
  res.json({ message: "Blog post deleted." });
}

module.exports = {
  listPublic,
  getPublicBySlug,
  listAdmin,
  getAdminById,
  createAdmin,
  updateAdmin,
  setStatusAdmin,
  removeAdmin,
};
