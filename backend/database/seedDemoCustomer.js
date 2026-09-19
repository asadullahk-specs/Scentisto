/**
 * database/seedDemoCustomer.js
 *
 * Creates a fixed demo customer account (for reviewing the storefront
 * account panel - order history, order detail, etc.) and, if any
 * products have been seeded (`npm run db:seed-products`), a couple
 * of sample past orders against that account so the panel isn't
 * empty on first look.
 *
 * Usage: npm run db:seed-demo-customer
 * Safe to re-run - skips the account if it already exists, and only
 * adds sample orders the first time (won't duplicate on re-run).
 *
 * Demo login:
 * Email: demo.customer@scentisto.com
 * Password: DemoCustomer123!
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const { connectDB, mongoose } = require("../src/config/db");
const { User } = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");

const DEMO_EMAIL = "demo.customer@scentisto.com";
const DEMO_PASSWORD = "DemoCustomer123!";

function buildOrderFromProduct(
  product,
  variant,
  userId,
  orderNumber,
  status,
  daysAgo,
) {
  const unitPrice = variant.salePrice || variant.price;
  const lineTotal = Number((unitPrice * 1).toFixed(2));
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return {
    orderNumber,
    userId,
    items: [
      {
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        imageUrl: product.primaryMediaUrl || null,
        variantId: variant._id,
        variantLabel: variant.label,
        sku: variant.sku,
        unitPrice,
        quantity: 1,
        lineTotal,
      },
    ],
    shippingAddress: {
      firstName: "Demo",
      lastName: "Customer",
      phone: "+1 555 0100",
      email: DEMO_EMAIL,
      country: "United States",
      city: "New York",
      state: "NY",
      address: "123 Fifth Avenue, Apt 4B",
    },
    paymentMethod: "cod",
    paymentStatus: status === "delivered" ? "paid" : "unpaid",
    subtotal: lineTotal,
    shippingCost: lineTotal >= 100 ? 0 : 9.99,
    tax: Number((lineTotal * 0.08).toFixed(2)),
    discount: 0,
    total: Number(
      (lineTotal + (lineTotal >= 100 ? 0 : 9.99) + lineTotal * 0.08).toFixed(2),
    ),
    status,
    statusHistory: [{ status, changedAt: createdAt }],
    createdAt,
  };
}

async function seed() {
  await connectDB();

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(
      DEMO_PASSWORD,
      Number(process.env.BCRYPT_SALT_ROUNDS || 12),
    );
    user = await User.create({
      firstName: "Demo",
      lastName: "Customer",
      email: DEMO_EMAIL,
      phone: "+1 555 0100",
      passwordHash,
      scope: "storefront",
      role: "customer",
      status: "active",
    });
    console.log(`Demo customer created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`Demo customer already exists: ${DEMO_EMAIL}`);
  }

  const existingOrders = await Order.countDocuments({ userId: user._id });
  if (existingOrders > 0) {
    console.log(
      `Demo customer already has ${existingOrders} order(s) - skipping sample orders.`,
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  const products = await Product.find({
    "variants.0": { $exists: true },
  }).limit(3);
  if (products.length === 0) {
    console.log(
      "No products found yet - run `npm run db:seed-products` first if you want sample orders too.",
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  const statuses = ["delivered", "shipped", "pending"];
  const orders = products.map((product, i) =>
    buildOrderFromProduct(
      product,
      product.variants[0],
      user._id,
      `SCN-DEMO-${1000 + i}`,
      statuses[i % statuses.length],
      (i + 1) * 6,
    ),
  );

  await Order.insertMany(orders);
  console.log(`Seeded ${orders.length} sample order(s) for the demo customer.`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Demo customer seed failed:", err.message);
  process.exit(1);
});
