/**
 * src/config/db.js
 *
 * One connection strategy shared by the long-running server
 * (src/server.js) and the Vercel serverless entry (api/index.js).
 *
 * Serverless notes - this is the part that was wrong before:
 *  - The cached flag must be a *promise*, not a boolean. Under a
 *    burst of concurrent cold invocations, a boolean lets several
 *    requests each call mongoose.connect() before the first
 *    resolves, so one warm Lambda opens several pools against Atlas
 *    and eventually trips the cluster's connection limit. Caching
 *    the in-flight promise makes every concurrent caller await the
 *    same single connect.
 *  - The cache must hang off globalThis, not module scope. Vercel
 *    can re-evaluate the module while reusing the process, which
 *    silently resets module-level state.
 *  - autoIndex must be OFF in production. Mongoose's default is ON,
 *    and api/index.js never overrode it, so every cold start was
 *    issuing createIndex for every schema against the production
 *    cluster.
 *  - maxPoolSize is deliberately small: each serverless instance
 *    handles one request at a time, so a large pool just consumes
 *    the Atlas connection budget across many instances.
 */
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", true);

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_SERVERLESS = Boolean(process.env.VERCEL);

const cache = (globalThis.__scentistoMongoose ??= {
  conn: null,
  promise: null,
  listenersBound: false,
});

function bindConnectionListeners() {
  if (cache.listenersBound) return;
  cache.listenersBound = true;
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
    // Drop the cached promise so the next request reconnects instead
    // of awaiting a connection that will never come back.
    cache.conn = null;
    cache.promise = null;
  });
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Set it in the deployment environment (Vercel → Project → Settings → Environment Variables), or copy .env.example to .env locally.",
    );
  }

  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  if (!cache.promise) {
    bindConnectionListeners();
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: IS_SERVERLESS ? 7000 : 8000, // under Vercel's 10s function ceiling, so a DB outage returns a real 503 instead of a platform timeout
        socketTimeoutMS: 20000,
        // Build indexes from a deploy step (npm run db:sync-indexes),
        // never on request-path boot.
        autoIndex: !IS_PRODUCTION,
        maxPoolSize: IS_SERVERLESS ? 5 : 10,
        minPoolSize: 0,
        // Surface "not connected" as an error instead of queueing a
        // command forever when the pool is down.
        bufferCommands: false,
      })
      .then((m) => {
        if (!IS_SERVERLESS) {
          console.log(`MongoDB connected: ${m.connection.name}`);
        }
        cache.conn = m.connection;
        return m.connection;
      })
      .catch((err) => {
        // Never cache a failed attempt - the next request must retry.
        cache.promise = null;
        throw err;
      });
  }

  return cache.promise;
}

module.exports = { connectDB, mongoose };
