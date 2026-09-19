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

// In the deployed topology the storefront and this API are served
// from the SAME Vercel domain (vercel.json rewrites /api/* to the
// function), so production browser traffic is same-origin and never
// sends an Origin that needs allowing. The allow-list below therefore
// only has to cover local development and any extra custom domain.
//
// Previously any *.vercel.app origin was accepted, which means every
// unrelated Vercel-hosted site on the internet could call this API
// from a browser with a victim's Authorization header if it ever got
// one. That blanket rule is gone; preview deployments are opted in
// explicitly via VERCEL_PREVIEW_ORIGIN_SUFFIX instead.
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.ADMIN_ORIGIN,
  process.env.PUBLIC_SITE_ORIGIN,
]
  .filter(Boolean)
  .flatMap((value) => value.split(",").map((v) => v.trim()))
  .filter(Boolean);

// e.g. "scentisto-xyz.vercel.app" or ".scentisto.vercel.app" - only
// this project's own preview subdomains, not all of *.vercel.app.
const previewSuffix = (process.env.VERCEL_PREVIEW_ORIGIN_SUFFIX || "").trim();

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin navigation, curl, server-to-server.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (previewSuffix && origin.endsWith(previewSuffix)) {
        return callback(null, true);
      }
      // Outside production, keep localhost on any port working so a
      // dev server started on 5175 instead of 5173 isn't blocked.
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
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
  res.set("Cache-Control", "no-store");
  res
    .status(dbState === 1 ? 200 : 503)
    .json({ status: dbState === 1 ? "ok" : "db_unavailable" });
});

// Never let a cache hold on to anything session-scoped.
app.use(["/api/auth", "/api/cart", "/api/orders", "/api/admin"], (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

/**
 * Public catalog GETs are anonymous and byte-identical for every
 * visitor, so they are safe to serve from Vercel's edge cache. This
 * is what stops a serverless function (and an Atlas round-trip) from
 * running for every single homepage view.
 *
 * max-age=0 keeps the *browser* from holding a private copy, so a
 * shopper never sees a stale price after a hard refresh; s-maxage
 * applies only to the shared CDN, and stale-while-revalidate lets the
 * CDN serve the old copy while it refreshes in the background.
 *
 * TRADE-OFF, deliberately chosen: an Admin edit can take up to
 * s-maxage seconds to appear on the public site. The windows below
 * are kept short for that reason, and the product *detail* endpoint
 * is left uncached entirely because it carries per-request live data
 * (view counter, "N people viewing now").
 */
function edgeCache(sMaxAge, staleWhileRevalidate) {
  return (req, res, next) => {
    if (req.method === "GET") {
      res.set(
        "Cache-Control",
        `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
      );
    }
    next();
  };
}

app.use("/api/auth", authRoutes);

// Public storefront catalog - read-only, only published/visible records.
app.use("/api/products", edgeCache(30, 120), productRoutes);
app.use("/api/categories", edgeCache(120, 600), categoryRoutes);
app.use("/api/collections", edgeCache(120, 600), collectionRoutes);
app.use("/api/reviews", edgeCache(60, 300), reviewRoutes);
app.use("/api/homepage", edgeCache(30, 120), homepageRoutes);
app.use("/api/blogs", edgeCache(120, 600), blogRoutes);

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
