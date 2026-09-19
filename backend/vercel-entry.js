/**
 * backend/vercel-entry.js  –  Vercel Serverless entry point
 *
 * Vercel invokes this as a serverless function for /api/* requests.
 * Must export the Express app directly (do NOT call app.listen()).
 * MongoDB is connected lazily so cold-start doesn't time out.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./src/app");

let isConnected = false;

async function connectIfNeeded() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

module.exports = async (req, res) => {
  try {
    await connectIfNeeded();
  } catch (err) {
    console.error("DB connection failed:", err.message);
    return res.status(503).json({ error: "Database unavailable." });
  }
  return app(req, res);
};
