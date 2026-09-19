const notificationModel = require("../models/notificationModel");
const { parsePagination, buildMeta } = require("../utils/pagination");

async function list(req, res) {
  const { page, perPage, offset, limit } = parsePagination(req.query);
  const { rows, total } = await notificationModel.listForStaff(req.user, {
    limit,
    offset,
    unreadOnly: req.query.unreadOnly === "true",
  });
  res.json({ notifications: rows, meta: buildMeta({ page, perPage, total }) });
}

async function unreadCount(req, res) {
  const count = await notificationModel.getUnreadCount(req.user);
  res.json({ count });
}

async function markRead(req, res) {
  await notificationModel.markRead(req.params.id, req.user.sub);
  res.json({ message: "Marked read." });
}

async function markAllRead(req, res) {
  await notificationModel.markAllRead(req.user);
  res.json({ message: "All notifications marked read." });
}

module.exports = { list, unreadCount, markRead, markAllRead };
