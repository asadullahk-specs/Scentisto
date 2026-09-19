/**
 * src/config/db.js
 *
 * MongoDB Atlas connection via Mongoose. Replaces the old mysql2
 * pool. Mongoose casts/validates every field against its schema
 * before a write ever reaches MongoDB, and every query built with
 * the query builder (Model.find({ field: value })) is parameterized
 * by construction - user input is never interpolated into a query
 * string the way raw SQL could be.
 *
 * The one NoSQL-specific risk this doesn't fully cover: if a route
 * passes a raw req.body/req.query object straight into a Mongoose
 * query, an attacker-supplied operator like { "$gt": "" } could
 * change the query's meaning ("NoSQL injection"). We close that gap
 * globally in app.js with express-mongo-sanitize, which strips any
 * key starting with "$" or containing "." from req.body/query/params
 * before it reaches a controller.
 */
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", true);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill it in.",
    );
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  await mongoose.connect(uri, {
    // Fail fast in dev instead of hanging if Atlas network access
    // isn't configured yet - see README "Atlas setup".
    serverSelectionTimeoutMS: 8000,
    autoIndex: process.env.NODE_ENV !== "production", // build indexes automatically outside prod
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };
