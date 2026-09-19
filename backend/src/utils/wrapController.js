/**
 * src/utils/wrapController.js
 *
 * Express 4 does not catch a rejected promise returned by an `async`
 * route handler. Several routers (productRoutes, categoryRoutes,
 * collectionRoutes, adminCatalogRoutes, adminProductRoutes,
 * authRoutes) registered their async controllers directly, without
 * asyncHandler. The consequence in production was not a 500 - it was
 * a request that never responded at all: any thrown error (Mongo
 * duplicate-key on create, a CastError on a bad id, Atlas being
 * unreachable) produced an unhandled rejection and the socket just
 * hung until Vercel's function timeout killed it. That is what makes
 * an Admin "Save"/"Add" button appear to do nothing.
 *
 * Rather than editing every route registration, each affected
 * controller exports through this wrapper: every exported function is
 * wrapped so its rejection is forwarded to next(), and therefore to
 * the central error handler in app.js.
 *
 * Double-wrapping is harmless - a router that already applies
 * asyncHandler to an already-wrapped function still behaves
 * correctly - so this is safe to apply to shared controllers.
 */
const asyncHandler = require("./asyncHandler");

function wrapController(controller) {
  const wrapped = {};
  for (const [name, value] of Object.entries(controller)) {
    wrapped[name] = typeof value === "function" ? asyncHandler(value) : value;
  }
  return wrapped;
}

module.exports = wrapController;
