/**
 * src/models/analyticsModel.js
 *
 * Everything the Admin Dashboard needs, read straight off the models
 * that already exist from Phases 0-5 - no new collections. Deliberately
 * kept as one file rather than splitting per-widget: every function
 * here answers a single dashboard question and nothing calls another
 * function in this file, so there's no shared-state reason to split it.
 *
 * "Revenue" throughout excludes orders that never became real sales
 * (cancelled, failed payment) - counting a cancelled order's total
 * would overstate revenue for a number that's supposed to mean money
 * that actually moved. Order *counts* elsewhere (e.g. status
 * breakdown) intentionally include every status, cancelled included,
 * since "how many orders came in" and "how much did we make" are
 * different questions.
 */
const Order = require("./Order");
const { User } = require("./User");
const Product = require("./Product");
const ActivityLog = require("./ActivityLog");

const NON_REVENUE_STATUSES = ["cancelled", "failed_payment"];

function dayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

// ---------------------------------------------------------------
// KPI summary - current period vs. the immediately preceding period
// of equal length, computed in one aggregation ($facet) so both
// windows are read from the same point-in-time snapshot of the data.
// ---------------------------------------------------------------
async function getOrderKpis({ from, to, prevFrom, prevTo }) {
  const [result] = await Order.aggregate([
    { $match: { createdAt: { $gte: prevFrom, $lte: to } } },
    {
      $facet: {
        current: [
          { $match: { createdAt: { $gte: from, $lte: to } } },
          { $group: bucketGroup() },
        ],
        previous: [
          { $match: { createdAt: { $gte: prevFrom, $lte: prevTo } } },
          { $group: bucketGroup() },
        ],
      },
    },
  ]);

  return {
    current: shapeBucket(result.current[0]),
    previous: shapeBucket(result.previous[0]),
  };
}

function bucketGroup() {
  return {
    _id: null,
    orders: { $sum: 1 },
    cancelledOrders: {
      $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
    },
    revenue: {
      $sum: {
        $cond: [{ $in: ["$status", NON_REVENUE_STATUSES] }, 0, "$total"],
      },
    },
    revenueOrders: {
      $sum: { $cond: [{ $in: ["$status", NON_REVENUE_STATUSES] }, 0, 1] },
    },
  };
}

function shapeBucket(bucket) {
  const b = bucket || {
    orders: 0,
    cancelledOrders: 0,
    revenue: 0,
    revenueOrders: 0,
  };
  return {
    orders: b.orders,
    cancelledOrders: b.cancelledOrders,
    revenue: b.revenue,
    averageOrderValue: b.revenueOrders > 0 ? b.revenue / b.revenueOrders : 0,
  };
}

async function getNewCustomerCounts({ from, to, prevFrom, prevTo }) {
  const [current, previous] = await Promise.all([
    User.countDocuments({
      scope: "storefront",
      createdAt: { $gte: from, $lte: to },
    }),
    User.countDocuments({
      scope: "storefront",
      createdAt: { $gte: prevFrom, $lte: prevTo },
    }),
  ]);
  return { current, previous };
}

// ---------------------------------------------------------------
// Revenue-over-time series (for the dashboard chart). Days with no
// orders are filled with zero so the chart's x-axis is continuous
// rather than skipping gaps.
// ---------------------------------------------------------------
async function getRevenueSeries({ from, to }) {
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        status: { $nin: NON_REVENUE_STATUSES },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(
    rows.map((r) => [r._id, { revenue: r.revenue, orders: r.orders }]),
  );

  const series = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = dayKey(cursor);
    const point = byDay.get(key) || { revenue: 0, orders: 0 };
    series.push({ date: key, revenue: point.revenue, orders: point.orders });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

async function getStatusBreakdown({ from, to }) {
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ status: r._id, count: r.count }));
}

// Best sellers by revenue within the period, read off the *order
// line items* (not Product.salesCount, which is lifetime-to-date) so
// this genuinely reflects the selected date range. Item snapshots
// (productName/productSlug) mean this needs no join back to Product.
async function getTopProducts({ from, to, limit = 5 }) {
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        status: { $nin: NON_REVENUE_STATUSES },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.productName" },
        slug: { $first: "$items.productSlug" },
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({
    productId: r._id ? r._id.toString() : null,
    name: r.name,
    slug: r.slug,
    quantity: r.quantity,
    revenue: r.revenue,
  }));
}

// ---------------------------------------------------------------
// Low stock - every visible variant on a published product at or
// under its own reorderLevel. Point-in-time (not date-ranged).
// ---------------------------------------------------------------
const LOW_STOCK_MATCH = {
  status: "published",
  "variants.isVisible": true,
  $expr: { $lte: ["$variants.stock", "$variants.reorderLevel"] },
};

async function getLowStockProducts({ limit = 8 }) {
  const rows = await Product.aggregate([
    { $match: { status: "published" } },
    { $unwind: "$variants" },
    { $match: LOW_STOCK_MATCH },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        name: "$name",
        slug: "$slug",
        variantLabel: "$variants.label",
        stock: "$variants.stock",
        reorderLevel: "$variants.reorderLevel",
      },
    },
    { $sort: { stock: 1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ ...r, productId: r.productId.toString() }));
}

async function getLowStockCount() {
  const [result] = await Product.aggregate([
    { $match: { status: "published" } },
    { $unwind: "$variants" },
    { $match: LOW_STOCK_MATCH },
    { $count: "count" },
  ]);
  return result ? result.count : 0;
}

// ---------------------------------------------------------------
// Activity log - the dashboard's compact recent feed, and the full
// filterable/paginated Activity Log page share this shaping.
// ---------------------------------------------------------------
function shapeActivity(row) {
  return {
    id: row._id.toString(),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ? row.entityId.toString() : null,
    previousValue: row.previousValue || null,
    newValue: row.newValue || null,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    user: row.userId
      ? {
          id: row.userId._id.toString(),
          firstName: row.userId.firstName,
          lastName: row.userId.lastName,
          role: row.userId.role,
        }
      : null,
  };
}

async function getRecentActivity({ limit = 12 }) {
  const rows = await ActivityLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "firstName lastName role")
    .lean();
  return rows.map(shapeActivity);
}

async function listActivity({ action, entityType, userId, limit, offset }) {
  const filter = {};
  // Prefix match ("order." matches "order.status.shipped" etc.) - action
  // names are a controlled vocabulary written by our own controllers, so
  // no need to escape regex metacharacters from user input here beyond
  // what express-validator already constrains at the route layer.
  if (action) filter.action = new RegExp(`^${action}`, "i");
  if (entityType) filter.entityType = entityType;
  if (userId) filter.userId = userId;

  const [rows, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("userId", "firstName lastName role")
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);
  return { rows: rows.map(shapeActivity), total };
}

module.exports = {
  getOrderKpis,
  getNewCustomerCounts,
  getRevenueSeries,
  getStatusBreakdown,
  getTopProducts,
  getLowStockProducts,
  getLowStockCount,
  getRecentActivity,
  listActivity,
};
