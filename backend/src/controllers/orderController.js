const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const notificationModel = require("../models/notificationModel");
const { parsePagination, buildMeta } = require("../utils/pagination");
const { ORDER_STATUSES } = require("../models/Order");

// Roles that actually handle fulfillment - same allow-list the
// PATCH /admin/orders/:id/status route already restricts status
// changes to, so whoever gets notified is exactly who can act on it.
const FULFILLMENT_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "warehouse",
  "customer_support",
];

// ---------------------------------------------------------------
// CUSTOMER
// ---------------------------------------------------------------

async function createOrder(req, res) {
  const order = await orderModel.createOrderFromCart(
    req.user.sub,
    req.body.shippingAddress,
  );
  await userModel.logActivity({
    userId: req.user.sub,
    action: "order.create",
    ip: req.ip,
    entityType: "Order",
    entityId: order.id,
  });
  // Best-effort - a dropped notification should never fail the checkout response.
  notificationModel
    .notifyRoles(FULFILLMENT_ROLES, {
      type: "order.new",
      title: "New order placed",
      message: `Order ${order.orderNumber} - Rs. ${Math.round(order.total)}`,
      link: `/admin/orders/${order.id}`,
    })
    .catch(() => {});
  res.status(201).json({ order });
}

async function listMyOrders(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await orderModel.listByUser(req.user.sub, {
    limit,
    offset,
  });
  res.json({ orders: rows, meta: buildMeta({ page, perPage, total }) });
}

async function getMyOrder(req, res) {
  const order = await orderModel.getByIdForUser(req.params.id, req.user.sub);
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json({ order });
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

async function listAdmin(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await orderModel.listAdmin({
    status: req.query.status || undefined,
    search: req.query.search || undefined,
    limit,
    offset,
  });
  res.json({ orders: rows, meta: buildMeta({ page, perPage, total }) });
}

async function getAdminById(req, res) {
  const order = await orderModel.getByIdAdmin(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json({ order });
}

async function updateStatusAdmin(req, res) {
  const { status, trackingNumber, courierCompany, internalNotes } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res
      .status(422)
      .json({ error: `Status must be one of: ${ORDER_STATUSES.join(", ")}.` });
  }
  const order = await orderModel.updateStatus(
    req.params.id,
    status,
    req.user.sub,
    {
      trackingNumber,
      courierCompany,
      internalNotes,
    },
  );
  if (!order) return res.status(404).json({ error: "Order not found." });

  await userModel.logActivity({
    userId: req.user.sub,
    action: `order.status.${status}`,
    ip: req.ip,
    entityType: "Order",
    entityId: order.id,
  });

  res.json({ order });
}

module.exports = {
  createOrder,
  listMyOrders,
  getMyOrder,
  listAdmin,
  getAdminById,
  updateStatusAdmin,
};
