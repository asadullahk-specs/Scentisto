/**
 * src/models/reviewModel.js
 */
const Review = require("./Review");

const MIN_LENGTH_WITH_IMAGE = 80;
const MIN_LENGTH_WITHOUT_IMAGE = 150;

/** Mirrors the client-side validation - the server never trusts the client alone. */
function validateReviewText(reviewText, hasImages) {
  const minLength = hasImages
    ? MIN_LENGTH_WITH_IMAGE
    : MIN_LENGTH_WITHOUT_IMAGE;
  if ((reviewText || "").trim().length < minLength) {
    return `Reviews ${hasImages ? "with a photo" : "without a photo"} need at least ${minLength} characters.`;
  }
  return null;
}

async function listPublicByProduct(productId, { limit = 10, offset = 0 } = {}) {
  const filter = { productId, status: "approved" };
  const [rows, total] = await Promise.all([
    Review.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit),
    Review.countDocuments(filter),
  ]);
  return { rows, total };
}

async function getRatingSummary(productId) {
  const rows = await Review.aggregate([
    { $match: { productId: productId, status: "approved" } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  let sum = 0;
  for (const row of rows) {
    breakdown[row._id] = row.count;
    total += row.count;
    sum += row._id * row.count;
  }
  return {
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    total,
    breakdown,
  };
}

async function create({
  productId,
  userId,
  customerName,
  rating,
  reviewText,
  images,
}) {
  const error = validateReviewText(reviewText, (images || []).length > 0);
  if (error) {
    throw Object.assign(new Error(error), { status: 422 });
  }
  const review = await Review.create({
    productId,
    userId,
    customerName,
    rating,
    reviewText: reviewText.trim(),
    images: images || [],
    status: "pending",
  });
  return review.id;
}

async function listAdmin({
  status,
  productId,
  search,
  limit = 20,
  offset = 0,
} = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (productId) filter.productId = productId;
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { reviewText: { $regex: search, $options: "i" } },
    ];
  }
  const [rows, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("productId", "name slug primaryMediaUrl"),
    Review.countDocuments(filter),
  ]);
  return { rows, total };
}

async function getById(id) {
  return Review.findById(id);
}

async function setStatus(id, status) {
  await Review.updateOne({ _id: id }, { $set: { status } });
}

async function setFeatured(id, isFeatured) {
  await Review.updateOne(
    { _id: id },
    { $set: { isFeatured: Boolean(isFeatured) } },
  );
}

async function reply(id, adminReply) {
  await Review.updateOne({ _id: id }, { $set: { adminReply } });
}

async function remove(id) {
  await Review.deleteOne({ _id: id });
}

module.exports = {
  listPublicByProduct,
  getRatingSummary,
  create,
  listAdmin,
  getById,
  setStatus,
  setFeatured,
  reply,
  remove,
  MIN_LENGTH_WITH_IMAGE,
  MIN_LENGTH_WITHOUT_IMAGE,
};
