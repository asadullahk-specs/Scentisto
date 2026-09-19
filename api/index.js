/**
 * api/index.js — Vercel Serverless Function Entry Point
 *
 * Vercel invokes this file for all /api/* requests.
 * Lazily connects to MongoDB Atlas so serverless instances reuse
 * connections across warm invocations and avoid connection churn.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const app = require("../backend/src/app");

let isConnected = false;

async function connectIfNeeded() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  isConnected = true;
}

module.exports = async (req, res) => {
  try {
    await connectIfNeeded();
  } catch (err) {
    console.error("Vercel Serverless DB connection failed:", err.message);
    return res.status(503).json({
      error: "Database unavailable.",
      details: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
  return app(req, res);
};
