/**
 * src/models/userModel.js
 *
 * Thin wrapper around the User/LoginHistory/ActivityLog Mongoose
 * models, exposing the same function names the controllers already
 * call - only the MySQL-specific internals changed underneath.
 */
const { User } = require("./User");
const LoginHistory = require("./LoginHistory");
const ActivityLog = require("./ActivityLog");

async function findByEmail(email) {
  // passwordHash is select:false by default - login needs it, so ask explicitly.
  return User.findOne({ email }).select("+passwordHash");
}

async function findById(id) {
  return User.findById(id);
}

async function createCustomer({
  firstName,
  lastName,
  email,
  phone,
  passwordHash,
}) {
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone: phone || null,
    passwordHash,
    scope: "storefront",
    role: "customer",
    status: "active",
  });
  return user.id;
}

async function recordFailedAttempt(userId, maxAttempts, lockoutMinutes) {
  const user = await User.findById(userId).select(
    "+passwordHash failedLoginAttempts",
  );
  if (!user) return;
  const attempts = user.failedLoginAttempts + 1;
  const update = { failedLoginAttempts: attempts };
  if (attempts >= maxAttempts) {
    update.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
  }
  await User.updateOne({ _id: userId }, { $set: update });
}

async function resetFailedAttempts(userId) {
  await User.updateOne(
    { _id: userId },
    { $set: { failedLoginAttempts: 0, lockedUntil: null } },
  );
}

async function recordSuccessfulLogin(userId, ip) {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    },
  );
}

async function logLoginAttempt({
  userId,
  emailAttempted,
  success,
  reason,
  ip,
  userAgent,
}) {
  await LoginHistory.create({
    userId: userId || null,
    emailAttempted,
    success,
    reason: reason || null,
    ipAddress: ip || null,
    userAgent: userAgent || null,
  });
}

async function logActivity({
  userId,
  action,
  ip,
  entityType,
  entityId,
  previousValue,
  newValue,
}) {
  await ActivityLog.create({
    userId: userId || null,
    action,
    entityType: entityType || null,
    entityId: entityId || null,
    previousValue: previousValue || null,
    newValue: newValue || null,
    ipAddress: ip || null,
  });
}

module.exports = {
  findByEmail,
  findById,
  createCustomer,
  recordFailedAttempt,
  resetFailedAttempts,
  recordSuccessfulLogin,
  logLoginAttempt,
  logActivity,
};
