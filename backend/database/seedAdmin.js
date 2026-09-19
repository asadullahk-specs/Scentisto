/**
 * database/seedAdmin.js
 *
 * Creates the first Super Admin account for the Admin CMS. Run once
 * after MONGODB_URI is set and Atlas network access is configured:
 *
 * SEED_ADMIN_EMAIL=you@scentisto.com \
 * SEED_ADMIN_PASSWORD='A very strong passphrase 2026!' \
 * npm run db:seed-admin
 *
 * The password is never printed or logged - you must supply it via
 * environment variable so it never touches shell history or source
 * control. Safe to re-run: if the email already exists, it's a no-op.
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const { connectDB, mongoose } = require("../src/config/db");
const { User } = require("../src/models/User");

async function seed() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || "Super";
  const lastName = process.env.SEED_ADMIN_LAST_NAME || "Admin";

  if (!email || !password) {
    console.error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are required.",
    );
    process.exit(1);
  }
  if (password.length < Number(process.env.PASSWORD_MIN_LENGTH || 10)) {
    console.error(
      "SEED_ADMIN_PASSWORD does not meet the minimum length policy.",
    );
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`A user with email ${email} already exists. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    scope: "admin",
    role: "super_admin",
    status: "active",
  });

  console.log(`Super Admin account created for ${email}.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
