/**
 * src/controllers/authController.js
 *
 * Security model summary:
 * - Passwords: bcrypt hashed (never stored/logged in plain text).
 * - Brute force: per-account lockout (N failed attempts -> timed
 * lock) + per-IP rate limiting (rateLimiter.js), independent
 * of each other.
 * - Enumeration resistance: login failures return the same
 * generic message whether the email exists or the password
 * was wrong.
 * - Session: one short-lived JWT access token returned in the
 * JSON body only. It is never set as a cookie and the backend
 * never asks the frontend to persist it - the frontend keeps
 * it in memory so a page refresh always logs the user out
 * (see utils/jwt.js for the full rationale).
 * - Admin vs storefront: /auth/login only accepts users whose
 * scope is 'storefront'; /auth/admin/login only accepts
 * 'admin' scope. A leaked customer credential can never reach
 * the Admin CMS and vice versa.
 * - Every attempt (success or failure) is written to
 * login_history for the Admin "Login History" panel.
 */
const userModel = require("../models/userModel");
const {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");

const MAX_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5);
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_DURATION_MINUTES || 15);

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    scope: user.scope,
  };
}

async function register(req, res) {
  const { firstName, lastName, email, phone, password } = req.body;

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return res
      .status(422)
      .json({ error: "Validation failed.", details: strength.errors });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) {
    // Generic message - do not confirm the email is already registered.
    return res
      .status(409)
      .json({ error: "Unable to create account with the provided details." });
  }

  const passwordHash = await hashPassword(password);
  const userId = await userModel.createCustomer({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone,
    passwordHash,
  });

  await userModel.logActivity({ userId, action: "user.register", ip: req.ip });

  return res.status(201).json({
    message: "Account created. You can now log in.",
  });
}

async function _login(req, res, expectedScope) {
  const { email, password } = req.body;
  const normalizedEmail = (email || "").toLowerCase().trim();
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  const user = await userModel.findByEmail(normalizedEmail);

  if (!user || user.scope !== expectedScope) {
    await userModel.logLoginAttempt({
      emailAttempted: normalizedEmail,
      success: false,
      reason: "no_such_account",
      ip,
      userAgent,
    });
    return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    await userModel.logLoginAttempt({
      userId: user.id,
      emailAttempted: normalizedEmail,
      success: false,
      reason: "locked",
      ip,
      userAgent,
    });
    return res.status(423).json({
      error: `Too many failed attempts. This account is temporarily locked. Try again later.`,
    });
  }

  if (user.status !== "active") {
    await userModel.logLoginAttempt({
      userId: user.id,
      emailAttempted: normalizedEmail,
      success: false,
      reason: "inactive_account",
      ip,
      userAgent,
    });
    return res
      .status(403)
      .json({ error: "This account is not active. Contact support." });
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    await userModel.recordFailedAttempt(user.id, MAX_ATTEMPTS, LOCKOUT_MINUTES);
    await userModel.logLoginAttempt({
      userId: user.id,
      emailAttempted: normalizedEmail,
      success: false,
      reason: "bad_password",
      ip,
      userAgent,
    });
    return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  }

  await userModel.recordSuccessfulLogin(user.id, ip);
  await userModel.logLoginAttempt({
    userId: user.id,
    emailAttempted: normalizedEmail,
    success: true,
    reason: "ok",
    ip,
    userAgent,
  });
  await userModel.logActivity({ userId: user.id, action: "user.login", ip });

  const accessToken = signAccessToken(user);

  return res.status(200).json({
    accessToken,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    user: publicUser(user),
  });
}

async function loginStorefront(req, res) {
  return _login(req, res, "storefront");
}

async function loginAdmin(req, res) {
  return _login(req, res, "admin");
}

async function me(req, res) {
  const user = await userModel.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({ user: publicUser(user) });
}

async function logout(req, res) {
  // Stateless by design (no server-side session / refresh token to
  // revoke). This endpoint exists so the frontend has a single,
  // auditable place to call on logout, and so we can log the event.
  if (req.user) {
    await userModel.logActivity({
      userId: req.user.sub,
      action: "user.logout",
      ip: req.ip,
    });
  }
  return res.status(200).json({ message: "Logged out." });
}

module.exports = { register, loginStorefront, loginAdmin, me, logout };
