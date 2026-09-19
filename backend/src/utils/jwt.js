/**
 * src/utils/jwt.js
 *
 * By design SCENTISTO issues a single short-lived ACCESS token
 * per login (default 15 minutes) and nothing else - no refresh
 * token, no "remember me" cookie.
 *
 * Why: the product requirement is that both the customer and
 * the Admin session must end on page refresh. The frontend
 * therefore keeps the token only in React state (JS memory),
 * never in localStorage/sessionStorage/cookies. A page refresh
 * wipes memory, so the user is logged out automatically. Because
 * nothing is stored in the browser's persistent storage or in a
 * cookie the browser resends automatically, this also removes
 * the two main token-theft vectors: XSS reading localStorage,
 * and CSRF riding on an auto-attached cookie.
 */
const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const ISSUER = process.env.JWT_ISSUER || "scentisto.com";

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope, // 'storefront' | 'admin'
    },
    ACCESS_SECRET,
    {
      expiresIn: EXPIRES_IN,
      issuer: ISSUER,
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { issuer: ISSUER });
}

module.exports = { signAccessToken, verifyAccessToken };
