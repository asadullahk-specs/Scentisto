/**
 * api/index.js — Vercel Serverless Function entry point.
 *
 * vercel.json rewrites every /api/* request to this file. It must
 * export the Express app as a handler and must never call
 * app.listen().
 *
 * The connection itself is owned by backend/src/config/db.js so the
 * serverless path and the long-running server path cannot drift
 * apart (they previously used two different, both-flawed caching
 * strategies - see that file's header).
 */
require("dotenv").config();

const { connectDB } = require("../backend/src/config/db");
const app = require("../backend/src/app");

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error("Serverless DB connection failed:", err.message);
    // Written with plain Node response APIs rather than res.status()/
    // res.json(). Those helpers are added by Vercel's Node runtime,
    // not by Node itself, so depending on them here meant the one
    // code path that runs when the database is unreachable would
    // itself throw under any other runtime - turning a clean 503 into
    // an opaque 500 with no body, exactly when a useful error matters
    // most.
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(
      JSON.stringify({
        error: "Database unavailable. Please try again in a moment.",
        details:
          process.env.NODE_ENV !== "production" ? err.message : undefined,
      }),
    );
  }
  return app(req, res);
};
