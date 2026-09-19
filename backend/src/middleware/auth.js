/**
 * src/middleware/auth.js
 *
 * requireAuth - any valid, non-expired access token
 * requireScope(scope) - token must belong to 'storefront' or 'admin'
 * requireRole(...roles) - token's role must be in the allow-list
 *
 * The token is read ONLY from the Authorization: Bearer header -
 * never from a cookie - consistent with the memory-only session
 * model described in utils/jwt.js.
 */
const { verifyAccessToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid session." });
  }
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.user || req.user.scope !== scope) {
      return res
        .status(403)
        .json({ error: "You do not have access to this resource." });
    }
    return next();
  };
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to perform this action." });
    }
    return next();
  };
}

module.exports = { requireAuth, requireScope, requireRole };
