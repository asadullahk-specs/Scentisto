/**
 * src/app.js
 *
 * Security middleware stack, applied in order:
 * 1. helmet - secure HTTP headers (HSTS, no-sniff, frameguard, etc.)
 * 2. cors - only the configured storefront/admin origins may call the API
 * 3. morgan - request logging (dev)
 * 4. express.json - body parsing with a size limit (mitigates payload DoS)
 * 5. hpp - HTTP parameter pollution protection
 * 6. xss-clean - strips known XSS payloads from req.body/query/params
 * 7. mongoSanitize - strips "$"/"." keys from req.body/query/params so a
 * crafted payload like { "$gt": "" } can never be
 * interpreted as a MongoDB query operator (NoSQL
 * injection - the Mongo analogue of SQL injection)
 * 8. cookie-parser - only used for a CSRF token in later phases; no auth token
 * is ever placed in a cookie (see utils/jwt.js)
 */
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const xssClean = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminCatalogRoutes = require("./routes/adminCatalogRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminReviewRoutes = require("./routes/adminReviewRoutes");
const homepageRoutes = require("./routes/homepageRoutes");
const adminHomepageRoutes = require("./routes/adminHomepageRoutes");
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
const blogRoutes = require("./routes/blogRoutes");
const adminBlogRoutes = require("./routes/adminBlogRoutes");
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");

const app = express();

app.set("trust proxy", 1); // needed for correct req.ip behind a load balancer/reverse proxy

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.ADMIN_ORIGIN,
].filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin GET)
      if (!origin) return callback(null, true);
      // Allow configured origins (e.g. localhost, custom domain)
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow all Vercel deployments (production & preview subdomains)
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: false, // no cookies carry auth - nothing for the browser to auto-attach
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(hpp());
app.use(xssClean());
app.use(
  mongoSanitize({
    replaceWith: "_", // rewrite "$gt" -> "_gt" instead of silently deleting the key,
    // so a malformed request fails validation with a clear error
    // instead of a stripped field quietly changing query meaning.
  }),
);

// Strip identifying headers.
app.disable("x-powered-by");

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res
    .status(dbState === 1 ? 200 : 503)
    .json({ status: dbState === 1 ? "ok" : "db_unavailable" });
});

app.use("/api/auth", authRoutes);

// Public storefront catalog - read-only, only published/visible records.
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/blogs", blogRoutes);

// Admin CMS - every route inside requires an admin-scope session
// (enforced per-router via requireAuth + requireScope("admin")).
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin", adminCatalogRoutes); // -> /api/admin/categories, /api/admin/collections
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/homepage-sections", adminHomepageRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/blogs", adminBlogRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);

// Customer-only - every route inside requires a logged-in storefront
// account (enforced per-router via requireAuth + requireScope("storefront")).
// This is the real, server-side enforcement of "no checkout without
// login" - the frontend's ProtectedRoute is only the UX-level guard.
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Not found." }));

// Central error handler - never leak internals for an unexpected
// (5xx) failure. A deliberate 4xx thrown by application code (e.g.
// cartModel/orderModel's "out of stock", "cart is empty") has a
// message written for the customer to read, and always passes
// through as-is - masking those would turn a helpful checkout error
// into "Something went wrong" even in production.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  const status = err.status || 500;
  const isClientError = status >= 400 && status < 500;
  const exposeMessage = isClientError || process.env.NODE_ENV !== "production";
  res.status(status).json({
    error: exposeMessage ? err.message : "Something went wrong.",
  });
});

module.exports = app;
