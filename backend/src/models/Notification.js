/**
 * src/models/Notification.js
 *
 * A notification targets one of two ways:
 * - recipientUserId set -> a single specific staff member
 * - recipientRoles set -> a broadcast to everyone holding any of
 * those roles (e.g. "a new order needs
 * fulfilling" goes to warehouse/manager/
 * admin/super_admin, not to marketing)
 * exactly one of the two is populated per document.
 *
 * `readBy` - rather than a boolean `isRead`, a broadcast has multiple
 * recipients who each dismiss it independently, so read state has to
 * be per-user. A direct notification just ends up with at most one
 * entry in this array. `$ne: userId` against an array field is a
 * plain "this array does not contain userId" match in MongoDB, which
 * is exactly the "still unread for me" query the unread-count and
 * inbox list both need.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const notificationSchema = new Schema(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    recipientRoles: { type: [String], default: [], index: true },

    type: { type: String, required: true }, // e.g. 'order.new', 'review.new'
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },
    link: { type: String, default: null }, // admin-side route, e.g. /admin/orders/:id

    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, ...withId },
);

notificationSchema.index({ createdAt: -1 });

module.exports = model("Notification", notificationSchema);
