const reviewModel = require("../models/reviewModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");
const notificationModel = require("../models/notificationModel");
const { parsePagination, buildMeta } = require("../utils/pagination");

// Same allow-list PATCH /admin/reviews/:id/status is already restricted to.
const MODERATION_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "marketing",
  "customer_support",
];

// ---------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------

async function listForProduct(req, res) {
  const product = await productModel.getFullBySlug(req.params.slug, {
    isAdmin: false,
  });
  if (!product) return res.status(404).json({ error: "Product not found." });

  const { page, perPage, offset, limit } = parsePagination(req.query);
  const [{ rows, total }, summary] = await Promise.all([
    reviewModel.listPublicByProduct(product.id, { limit, offset }),
    reviewModel.getRatingSummary(product.id),
  ]);

  res.json({
    reviews: rows,
    summary,
    meta: buildMeta({ page, perPage, total }),
  });
}

async function create(req, res) {
  const { productId, rating, reviewText, images } = req.body;
  const product = await productModel.getFullById(productId, { isAdmin: false });
  if (!product) return res.status(404).json({ error: "Product not found." });

  const user = await userModel.findById(req.user.sub);

  const id = await reviewModel.create({
    productId,
    userId: req.user.sub,
    customerName: `${user.firstName} ${user.lastName.charAt(0)}.`, // matches the "Ahsan H." style in the reference design
    rating,
    reviewText,
    images,
  });

  res.status(201).json({
    message:
      "Thanks for your review - it will appear once approved by our team.",
    reviewId: id,
  });

  // Best-effort - a dropped notification should never fail the response
  // already sent above.
  notificationModel
    .notifyRoles(MODERATION_ROLES, {
      type: "review.new",
      title: "New review pending",
      message: `${user.firstName} left a ${rating}-star review on ${product.name}`,
      link: "/admin/reviews",
    })
    .catch(() => {});
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

async function listAdmin(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await reviewModel.listAdmin({
    status: req.query.status || undefined,
    productId: req.query.productId || undefined,
    search: req.query.search || undefined,
    limit,
    offset,
  });
  res.json({ reviews: rows, meta: buildMeta({ page, perPage, total }) });
}

async function setStatusAdmin(req, res) {
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res
      .status(422)
      .json({ error: "Status must be pending, approved, or rejected." });
  }
  const existing = await reviewModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Review not found." });
  await reviewModel.setStatus(req.params.id, status);
  await userModel.logActivity({
    userId: req.user.sub,
    action: `review.status.${status}`,
    ip: req.ip,
  });
  res.json({ message: `Review marked as ${status}.` });
}

async function setFeaturedAdmin(req, res) {
  const existing = await reviewModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Review not found." });
  await reviewModel.setFeatured(req.params.id, req.body.isFeatured);
  res.json({ message: "Updated." });
}

async function replyAdmin(req, res) {
  const existing = await reviewModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Review not found." });
  await reviewModel.reply(req.params.id, req.body.adminReply);
  res.json({ message: "Reply saved." });
}

async function removeAdmin(req, res) {
  const existing = await reviewModel.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Review not found." });
  await reviewModel.remove(req.params.id);
  res.json({ message: "Review deleted." });
}

module.exports = {
  listForProduct,
  create,
  listAdmin,
  setStatusAdmin,
  setFeaturedAdmin,
  replyAdmin,
  removeAdmin,
};
