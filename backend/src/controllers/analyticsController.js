const analyticsModel = require("../models/analyticsModel");
const { parsePagination, buildMeta } = require("../utils/pagination");

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_RANGES = [7, 30, 90];

// current window = [from, to] = the last N days, ending "now".
// previous window = the N days immediately before that, so a 30-day
// dashboard always compares against a 30-day baseline, not a
// mismatched calendar month - same logic works for 7 and 90.
function resolveRange(daysParam) {
  const days = ALLOWED_RANGES.includes(parseInt(daysParam, 10))
    ? parseInt(daysParam, 10)
    : 30;

  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  from.setUTCHours(0, 0, 0, 0);

  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * DAY_MS);
  prevFrom.setUTCHours(0, 0, 0, 0);

  return { days, from, to, prevFrom, prevTo };
}

// null = "no baseline to compare against" (previous period had zero),
// rendered by the frontend as "New" rather than a misleading "+100%".
function pctChange(current, previous) {
  if (!previous) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function getDashboard(req, res) {
  const range = resolveRange(req.query.days);

  const [
    orderKpis,
    customerCounts,
    series,
    statusBreakdown,
    topProducts,
    lowStock,
    lowStockCount,
    recentActivity,
  ] = await Promise.all([
    analyticsModel.getOrderKpis(range),
    analyticsModel.getNewCustomerCounts(range),
    analyticsModel.getRevenueSeries(range),
    analyticsModel.getStatusBreakdown(range),
    analyticsModel.getTopProducts({ from: range.from, to: range.to, limit: 5 }),
    analyticsModel.getLowStockProducts({ limit: 8 }),
    analyticsModel.getLowStockCount(),
    analyticsModel.getRecentActivity({ limit: 12 }),
  ]);

  res.json({
    range: { days: range.days, from: range.from, to: range.to },
    kpis: {
      revenue: {
        value: orderKpis.current.revenue,
        change: pctChange(
          orderKpis.current.revenue,
          orderKpis.previous.revenue,
        ),
      },
      orders: {
        value: orderKpis.current.orders,
        change: pctChange(orderKpis.current.orders, orderKpis.previous.orders),
      },
      averageOrderValue: {
        value: orderKpis.current.averageOrderValue,
        change: pctChange(
          orderKpis.current.averageOrderValue,
          orderKpis.previous.averageOrderValue,
        ),
      },
      newCustomers: {
        value: customerCounts.current,
        change: pctChange(customerCounts.current, customerCounts.previous),
      },
      cancelledOrders: { value: orderKpis.current.cancelledOrders },
      lowStockCount: { value: lowStockCount },
    },
    revenueSeries: series,
    statusBreakdown,
    topProducts,
    lowStockProducts: lowStock,
    recentActivity,
  });
}

async function getActivityLog(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await analyticsModel.listActivity({
    action: req.query.action || undefined,
    entityType: req.query.entityType || undefined,
    userId: req.query.userId || undefined,
    limit,
    offset,
  });
  res.json({ activity: rows, meta: buildMeta({ page, perPage, total }) });
}

module.exports = { getDashboard, getActivityLog };
