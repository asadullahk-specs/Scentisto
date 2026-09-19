/**
 * database/seedBlogs.js
 * Sample published blog posts with placeholder (Picsum) featured
 * images, so /blog isn't empty on first preview. Purely demo
 * content - write real posts from Admin -> Blogs whenever ready.
 *
 * Usage: npm run db:seed-blogs
 * Safe to re-run - skips anything whose slug already exists.
 */
require("dotenv").config();
const { connectDB, mongoose } = require("../src/config/db");
const Blog = require("../src/models/Blog");

const POSTS = [
  {
    title: "How to Make a Fragrance Last All Day",
    slug: "how-to-make-fragrance-last-all-day",
    excerpt:
      "Application spot, skin prep, and layering - the three things that actually change how long a scent lasts.",
    content:
      "<p>Longevity has less to do with the perfume itself and more to do with how it's applied. Moisturized skin holds fragrance far longer than dry skin, so a fragrance-free lotion applied right before spraying makes a real difference.</p><p>Pulse points - wrists, neck, behind the ears - work because they're warm, and warmth is what releases a fragrance's notes over the day. Avoid rubbing your wrists together after spraying; it breaks down the top notes faster than they're meant to fade.</p>",
    featuredImageUrl:
      "https://picsum.photos/seed/scentisto-blog-longevity/1200/800",
    tags: ["fragrance-tips"],
    status: "published",
    isFeatured: true,
    metaTitle: "How to Make a Fragrance Last All Day | SCENTISTO Journal",
  },
  {
    title: "A Gifting Guide for Fragrance Lovers",
    slug: "gifting-guide-for-fragrance-lovers",
    excerpt: "What to buy someone whose signature scent you don't know yet.",
    content:
      "<p>When you don't know someone's exact fragrance preference, gift sets solve the problem elegantly - a curated pairing feels considered without requiring you to guess a single scent correctly.</p><p>Unisex woody and amber fragrances are the safest starting point for a first fragrance gift; they read as sophisticated without leaning too sweet or too sharp for an unfamiliar nose.</p>",
    featuredImageUrl:
      "https://picsum.photos/seed/scentisto-blog-gifting/1200/800",
    tags: ["gifting"],
    status: "published",
    metaTitle: "A Gifting Guide for Fragrance Lovers | SCENTISTO Journal",
  },
  {
    title: "Inside Our New Launch: Mehkal",
    slug: "inside-our-new-launch-mehkal",
    excerpt:
      "The story behind our newest amber fragrance, from concept to bottle.",
    content:
      "<p>Mehkal started as a single idea - a fragrance dark enough to wear at night without disappearing into the background. Every iteration pushed the amber base warmer until it finally held its own against the smoky top notes.</p><p>The black-and-gold flacon was designed to match: understated until the light catches it.</p>",
    featuredImageUrl:
      "https://picsum.photos/seed/scentisto-blog-mehkal/1200/800",
    tags: ["new-launch"],
    status: "published",
    metaTitle: "Inside Our New Launch: Mehkal | SCENTISTO Journal",
  },
];

async function seed() {
  await connectDB();

  for (const post of POSTS) {
    const existing = await Blog.findOne({ slug: post.slug });
    if (existing) continue;
    await Blog.create({ ...post, publishedAt: new Date() });
  }

  console.log("Sample blog posts seeded (or already present).");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Blog seed failed:", err.message);
  process.exit(1);
});
