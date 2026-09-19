/**
 * src/models/notificationModel.js
 *
 * notifyRoles/notifyUser are called from other controllers right
 * after the event they describe already succeeded (new order placed,
 * new review submitted) - same pattern as userModel.logActivity,
 * which every phase's controllers already call the same way. A
 * failed notification insert should never take down the request that
 * triggered it, so callers wrap these in a best-effort catch.
 */
const Notification = require("./Notification");

async function notifyRoles(roles, { type, title, message, link } = {}) {
  await Notification.create({
    recipientRoles: roles,
    type,
    title,
    message,
    link: link || null,
  });
}

async function notifyUser(userId, { type, title, message, link } = {}) {
  await Notification.create({
    recipientUserId: userId,
    type,
    title,
    message,
    link: link || null,
  });
}

// A notification is "for" a staff member if it was sent directly to
// them, or broadcast to a role they currently hold.
function scopeFilter(user) {
  return {
    $or: [{ recipientUserId: user.sub }, { recipientRoles: user.role }],
  };
}

function shape(row, userId) {
  return {
    id: row._id.toString(),
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    createdAt: row.createdAt,
    isRead: row.readBy.some((id) => id.toString() === userId),
  };
}

async function listForStaff(
  user,
  { limit = 20, offset = 0, unreadOnly = false } = {},
) {
  const filter = scopeFilter(user);
  if (unreadOnly) filter.readBy = { $ne: user.sub };

  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  return { rows: rows.map((r) => shape(r, user.sub)), total };
}

async function getUnreadCount(user) {
  return Notification.countDocuments({
    ...scopeFilter(user),
    readBy: { $ne: user.sub },
  });
}

async function markRead(notificationId, userId) {
  await Notification.updateOne(
    { _id: notificationId },
    { $addToSet: { readBy: userId } },
  );
}

async function markAllRead(user) {
  await Notification.updateMany(scopeFilter(user), {
    $addToSet: { readBy: user.sub },
  });
}

module.exports = {
  notifyRoles,
  notifyUser,
  listForStaff,
  getUnreadCount,
  markRead,
  markAllRead,
};
