/**
 * database/seedHomepage.js
 *
 * Populates a sensible default homepage layout (hero, best sellers,
 * offer banner, new arrivals, featured collections, brand story,
 * testimonials, newsletter) so the storefront isn't blank the first
 * time you load it. Every image is a Picsum Photos placeholder
 * (free, no copyright concerns) - swap for real photography from
 * Admin → Homepage CMS whenever it's ready. Everything here is then
 * fully editable/reorderable from that same screen - this is a
 * starting point, not a fixed layout.
 *
 * Usage: npm run db:seed-homepage
 * Safe to re-run - skips entirely if any section already exists
 * (so it never clobbers layout changes you've made in the Admin CMS).
 */
require("dotenv").config();
const { connectDB, mongoose } = require("../src/config/db");
const HomepageSection = require("../src/models/HomepageSection");

const DEFAULT_SECTIONS = [
  {
    type: "hero",
    title: "Hero Section",
    displayOrder: 0,
    content: {
      heading: "Discover Your Signature Scent",
      subheading:
        "Luxury perfumes crafted with rare ingredients for unforgettable impressions.",
      imageUrl: "https://picsum.photos/seed/scentisto-hero-banner/1600/900",
      primaryLabel: "Shop Now",
      primaryLink: "/perfumes",
      secondaryLabel: "Our Story",
      secondaryLink: "/#our-story",
    },
  },
  {
    type: "featured_products",
    title: "Best Sellers",
    displayOrder: 1,
    content: {
      heading: "Best Sellers",
      sourceType: "auto",
      flag: "isBestSeller",
      limit: 5,
    },
  },
  {
    type: "offer_banner",
    title: "Offer Banner",
    displayOrder: 2,
    content: {
      heading: "Gift Sets, Ready to Give",
      subheading:
        "Two signature fragrances, boxed and ribboned - no extra wrap needed.",
      link: "/gift-sets",
    },
  },
  {
    type: "featured_products",
    title: "New Arrivals",
    displayOrder: 3,
    content: {
      heading: "New Arrivals",
      sourceType: "auto",
      flag: "isNewArrival",
      limit: 5,
    },
  },
  {
    type: "brand_story",
    title: "Brand Story",
    displayOrder: 4,
    content: {
      heading: "Our Story",
      body: "SCENTISTO is built on the belief that a fragrance should be worn, not just applied - every scent in our collection is developed in small batches with rare, carefully sourced ingredients.",
      imageUrl: "https://picsum.photos/seed/scentisto-brand-story/1200/675",
    },
  },
  {
    type: "testimonials",
    title: "Testimonials",
    displayOrder: 5,
    content: { heading: "What Our Customers Say", limit: 6 },
  },
];

async function seed() {
  await connectDB();

  const existingCount = await HomepageSection.countDocuments({});
  if (existingCount > 0) {
    console.log(
      `Homepage already has ${existingCount} section(s) - skipping (delete them first if you want to reset).`,
    );
  } else {
    await HomepageSection.insertMany(DEFAULT_SECTIONS);
    console.log(`Seeded ${DEFAULT_SECTIONS.length} default homepage sections.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Homepage seed failed:", err.message);
  process.exit(1);
});
