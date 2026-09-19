const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const activityLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: { type: String, required: true, index: true }, // e.g. 'user.login', 'product.create'
    entityType: { type: String, default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, ...withId },
);

module.exports = model("ActivityLog", activityLogSchema);
