/**
 * src/models/User.js
 *
 * Replaces the old users+roles MySQL tables. `scope` ('storefront' |
 * 'admin') and `role` (a specific RBAC role name) live directly on
 * the user document - a separate roles collection added nothing
 * once roles are a small fixed set defined in code, and this way a
 * login only ever needs one query instead of a join.
 *
 * passwordHash has `select: false` so it is never returned by a
 * normal query by accident - callers that need it (login) must ask
 * for it explicitly with `.select("+passwordHash")`.
 */
const { Schema, model } = require("mongoose");
const { withId } = require("../utils/mongooseHelpers");

const ROLE_NAMES = [
  "customer",
  "super_admin",
  "admin",
  "manager",
  "marketing",
  "warehouse",
  "customer_support",
  "content_editor",
];

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    phone: { type: String, default: null, trim: true },
    passwordHash: { type: String, required: true, select: false },

    scope: {
      type: String,
      enum: ["storefront", "admin"],
      required: true,
      index: true,
    },
    role: { type: String, enum: ROLE_NAMES, required: true },

    status: { type: String, enum: ["active", "suspended"], default: "active" },

    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  { timestamps: true, ...withId },
);

module.exports = { User: model("User", userSchema), ROLE_NAMES };
