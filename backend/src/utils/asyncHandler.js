/**
 * src/utils/asyncHandler.js
 *
 * Express 4 does not automatically catch a rejected promise thrown
 * inside an `async` route handler - without this, an error thrown by
 * cartModel/orderModel (e.g. "out of stock") would never reach the
 * central error handler in app.js and the request would hang instead
 * of returning a clean error response. Wrap any controller function
 * that can throw with this before passing it to router.get/post/etc.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
