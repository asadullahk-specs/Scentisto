/**
 * database/syncIndexes.js
 *
 * config/db.js disables Mongoose's autoIndex in production (building
 * indexes on every app boot is a production anti-pattern - it can
 * lock collections under load). Run this once after deploying a
 * schema change instead:
 *
 * npm run db:sync-indexes
 */
require("dotenv").config();
const { connectDB, mongoose } = require("../src/config/db");
const { User } = require("../src/models/User");
const Category = require("../src/models/Category");
const Collection = require("../src/models/Collection");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const { Counter } = require("../src/models/Counter");
const Review = require("../src/models/Review");
const HomepageSection = require("../src/models/HomepageSection");
const Blog = require("../src/models/Blog");
const Notification = require("../src/models/Notification");

async function run() {
  await connectDB();
  for (const Model of [
    User,
    Category,
    Collection,
    Product,
    Cart,
    Order,
    Counter,
    Review,
    HomepageSection,
    Blog,
    Notification,
  ]) {
    console.log(`Syncing indexes for ${Model.modelName}...`);
    await Model.syncIndexes();
  }
  console.log("Done.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Index sync failed:", err.message);
  process.exit(1);
});
