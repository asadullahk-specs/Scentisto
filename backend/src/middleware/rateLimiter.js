/**
 * src/middleware/rateLimiter.js
 *
 * IP-based rate limiting on authentication endpoints. This is a
 * second, independent layer of defense on top of the per-account
 * lockout logic in authController.js - one limits by IP, the
 * other by account, so an attacker can't bypass either alone
 * (e.g. by rotating IPs against one account, or spraying many
 * accounts from one IP).
 */
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs:
    Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many accounts created from this network. Please try again later.",
  },
});

// Order placement is state-changing and stock-affecting, not just a
// read - cap it independently of the general API traffic so it can't
// be hammered to exhaust inventory or spam order creation.
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.ORDER_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many orders placed from this network. Please try again shortly.",
  },
});

module.exports = { loginLimiter, registerLimiter, orderLimiter };
