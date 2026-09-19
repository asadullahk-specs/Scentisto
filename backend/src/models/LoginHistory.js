const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const loginHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    emailAttempted: { type: String, required: true },
    success: { type: Boolean, required: true },
    reason: { type: String, default: null }, // 'ok' | 'bad_password' | 'locked' | 'no_such_account' | 'inactive_account'
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, ...withId },
);

module.exports = model("LoginHistory", loginHistorySchema);
