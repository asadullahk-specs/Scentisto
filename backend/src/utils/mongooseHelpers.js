/**
 * src/utils/mongooseHelpers.js
 *
 * The old MySQL code (and every controller/route/frontend call
 * built on top of it) treats "id" as an opaque field on every
 * returned object. To avoid touching that surface just because the
 * underlying id type changed from an auto-increment int to an
 * ObjectId, every schema below uses this transform so `_id`
 * (ObjectId) is also exposed as a plain string `id`, and the
 * Mongoose-internal `_id`/`__v` are hidden from API responses.
 */
function idTransform(_doc, ret) {
  ret.id = ret._id ? ret._id.toString() : ret.id;
  delete ret._id;
  delete ret.__v;
  return ret;
}

const withId = {
  toJSON: { virtuals: true, transform: idTransform },
  toObject: { virtuals: true, transform: idTransform },
};

module.exports = { idTransform, withId };
