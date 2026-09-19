/**
 * src/models/Counter.js
 *
 * A single document per named sequence (e.g. "orderNumber"), used
 * with findOneAndUpdate($inc, upsert:true) to get an atomic,
 * gap-free-under-concurrency next number - MongoDB guarantees that
 * increment is atomic per-document even under concurrent order
 * placement, which a client-side Date.now()-based id could not.
 */
const { Schema, model } = require("mongoose");

const counterSchema = new Schema({
  _id: { type: String, required: true }, // sequence name, e.g. "orderNumber"
  seq: { type: Number, default: 0 },
});

const Counter = model("Counter", counterSchema);

async function nextSequence(name, { start = 0 } = {}) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.seq + start;
}

module.exports = { Counter, nextSequence };
