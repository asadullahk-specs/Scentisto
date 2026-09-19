/**
 * database/seedProducts.js
 *
 * Inserts sample categories/collections/products (with embedded ML
 * variants, gallery media incl. a hover image, and long-form details)
 * so the product system - and every visual surface that reads from
 * it (grid hover states, PDP gallery, urgency badges) - can be
 * previewed end-to-end without hand-building data through the API
 * first.
 *
 * Images are Picsum Photos (https://picsum.photos), a free
 * placeholder-image service with no copyright/licensing concerns -
 * NOT real product photography. Every URL is seeded deterministically
 * off the product's slug (`picsum.photos/seed/<slug>/...`) so re-runs
 * and every visitor see the same placeholder per product rather than
 * a random image on every request. Swap `primaryMediaUrl` /
 * `hoverImageUrl` / `media[].url` for real photos (or Google Drive
 * links, same as everywhere else in this app) from the Admin Product
 * Editor whenever real photography is ready - nothing about this
 * seed data is special-cased in the app itself.
 *
 * Usage: npm run db:seed-products
 * Safe to re-run - skips anything whose slug/sku already exists.
 */
require("dotenv").config();
const { connectDB, mongoose } = require("../src/config/db");
const Category = require("../src/models/Category");
const Collection = require("../src/models/Collection");
const Product = require("../src/models/Product");

function img(seed, w = 900, h = 1100) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

async function ensureCategory(data) {
  const existing = await Category.findOne({ slug: data.slug });
  if (existing) return existing.id;
  const category = await Category.create(data);
  return category.id;
}

async function ensureCollection(data) {
  const existing = await Collection.findOne({ slug: data.slug });
  if (existing) return existing.id;
  const collection = await Collection.create(data);
  return collection.id;
}

async function ensureProduct(slug, data) {
  const existing = await Product.findOne({ slug });
  if (existing) return existing.id;
  const product = await Product.create({ slug, ...data });
  return product.id;
}

async function seed() {
  await connectDB();

  // ---- Categories ----
  const woodyCategoryId = await ensureCategory({
    name: "Woody",
    slug: "woody",
    description: "Warm, rich fragrances built on cedar, sandalwood, and oud.",
    imageUrl: img("scentisto-cat-woody", 600, 600),
    isVisible: true,
  });
  const floralCategoryId = await ensureCategory({
    name: "Floral",
    slug: "floral",
    description: "Light, romantic fragrances built on rose, jasmine, and musk.",
    imageUrl: img("scentisto-cat-floral", 600, 600),
    isVisible: true,
  });
  const bottlesCategoryId = await ensureCategory({
    name: "Luxury Bottles",
    slug: "luxury-bottles",
    description: "Crystal and glass perfume bottles.",
    imageUrl: img("scentisto-cat-bottles", 600, 600),
    isVisible: true,
  });

  // ---- Collections ----
  const luxuryCollectionId = await ensureCollection({
    name: "Luxury Collection",
    slug: "luxury-collection",
    imageUrl: img("scentisto-col-luxury", 600, 750),
    isFeatured: true,
    isVisible: true,
  });
  const signatureCollectionId = await ensureCollection({
    name: "Signature Collection",
    slug: "signature-collection",
    imageUrl: img("scentisto-col-signature", 600, 750),
    isFeatured: true,
    isVisible: true,
  });

  // ---- Perfume: Oud Noir ----
  await ensureProduct("oud-noir", {
    type: "perfume",
    name: "Oud Noir",
    brand: "SCENTISTO",
    categoryId: woodyCategoryId,
    shortDescription:
      "A bold, mysterious fragrance of oud, amber, and warm musk.",
    description:
      "Oud Noir opens with spicy and smoky notes, leading into a rich heart of oud, amber, and warm musk. Made for those who leave a lasting impression.",
    sku: "SCN-PF-1001",
    price: 120.0,
    salePrice: 99.0,
    hasVariants: true,
    gender: "unisex",
    fragranceFamily: "Woody",
    primaryMediaType: "image",
    primaryMediaUrl: img("scentisto-oud-noir-primary"),
    hoverImageUrl: img("scentisto-oud-noir-hover"),
    status: "published",
    isFeatured: true,
    isTopSelling: true,
    isBestSeller: true,
    showOnHomepage: true,
    metaTitle: "Oud Noir | SCENTISTO Perfumes",
    metaDescription:
      "Discover Oud Noir - a bold woody fragrance of oud, amber, and musk.",
    publishedAt: new Date(),
    collectionIds: [luxuryCollectionId],
    variants: [
      {
        label: "50ml",
        sizeMl: 50,
        price: 120.0,
        salePrice: 99.0,
        sku: "SCN-PF-1001-50",
        stock: 78,
        isDefault: true,
        displayOrder: 0,
      },
      {
        label: "100ml",
        sizeMl: 100,
        price: 180.0,
        salePrice: 155.0,
        sku: "SCN-PF-1001-100",
        stock: 34,
        displayOrder: 1,
      },
    ],
    media: [
      {
        mediaType: "image",
        url: img("scentisto-oud-noir-gallery-1"),
        altText: "Oud Noir bottle, front",
        displayOrder: 0,
      },
      {
        mediaType: "image",
        url: img("scentisto-oud-noir-gallery-2"),
        altText: "Oud Noir bottle, lifestyle",
        displayOrder: 1,
      },
    ],
    details: {
      story:
        "Crafted in small batches, Oud Noir pairs rare oud with warm amber and soft musk.",
      longevity: "8-10 hours",
      projection: "Strong",
      sillage: "Heavy",
      season: "Fall, Winter",
      occasion: "Evening, Formal",
      topNotes: ["Saffron", "Black Pepper"],
      middleNotes: ["Oud", "Rose"],
      baseNotes: ["Amber", "Musk", "Sandalwood"],
    },
  });

  // ---- Perfume: Mehkal ----
  await ensureProduct("mehkal", {
    type: "perfume",
    name: "Mehkal",
    brand: "SCENTISTO",
    categoryId: woodyCategoryId,
    shortDescription: "A dark, gilded fragrance for those who command a room.",
    description:
      "Mehkal blends smoky incense with rich amber and a whisper of gold-dusted vanilla - a signature scent built for presence.",
    sku: "SCN-PF-1002",
    price: 79.0,
    salePrice: null,
    hasVariants: true,
    gender: "unisex",
    fragranceFamily: "Amber",
    primaryMediaType: "image",
    primaryMediaUrl: img("scentisto-mehkal-primary"),
    hoverImageUrl: img("scentisto-mehkal-hover"),
    status: "published",
    isNewArrival: true,
    isFeatured: true,
    showOnHomepage: true,
    metaTitle: "Mehkal | SCENTISTO Perfumes",
    metaDescription: "Mehkal - a dark, gilded amber fragrance.",
    publishedAt: new Date(),
    collectionIds: [signatureCollectionId],
    variants: [
      {
        label: "50ml",
        sizeMl: 50,
        price: 79.0,
        sku: "SCN-PF-1002-50",
        stock: 52,
        isDefault: true,
        displayOrder: 0,
      },
    ],
    media: [
      {
        mediaType: "image",
        url: img("scentisto-mehkal-gallery-1"),
        altText: "Mehkal bottle and box",
        displayOrder: 0,
      },
    ],
    details: {
      story:
        "Housed in a hand-finished black and gold flacon, Mehkal is built to be noticed.",
      longevity: "6-8 hours",
      projection: "Moderate",
      season: "All Season",
      occasion: "Evening",
      topNotes: ["Incense", "Bergamot"],
      middleNotes: ["Amber", "Cedar"],
      baseNotes: ["Vanilla", "Musk"],
    },
  });

  // ---- Perfume: Arsh ----
  await ensureProduct("arsh", {
    type: "perfume",
    name: "Arsh",
    brand: "SCENTISTO",
    categoryId: floralCategoryId,
    shortDescription: "A clean, elevated fragrance with a cool aquatic edge.",
    description:
      "Arsh opens crisp and mineral, settling into soft musk and pale woods - understated and effortless.",
    sku: "SCN-PF-1003",
    price: 89.0,
    salePrice: null,
    hasVariants: true,
    gender: "unisex",
    fragranceFamily: "Fresh",
    primaryMediaType: "image",
    primaryMediaUrl: img("scentisto-arsh-primary"),
    hoverImageUrl: img("scentisto-arsh-hover"),
    status: "published",
    isNewArrival: true,
    isTrending: true,
    showOnHomepage: true,
    metaTitle: "Arsh | SCENTISTO Perfumes",
    metaDescription: "Arsh - a clean, elevated fresh fragrance.",
    publishedAt: new Date(),
    variants: [
      {
        label: "50ml",
        sizeMl: 50,
        price: 89.0,
        sku: "SCN-PF-1003-50",
        stock: 40,
        isDefault: true,
        displayOrder: 0,
      },
    ],
    media: [
      {
        mediaType: "image",
        url: img("scentisto-arsh-gallery-1"),
        altText: "Arsh bottle on stone",
        displayOrder: 0,
      },
    ],
    details: {
      story:
        "Arsh is built around a single idea: clarity. Nothing about it is loud.",
      longevity: "5-7 hours",
      projection: "Light",
      season: "Spring, Summer",
      occasion: "Daily",
      topNotes: ["Bergamot", "Sea Salt"],
      middleNotes: ["Lavender", "Musk"],
      baseNotes: ["White Woods"],
    },
  });

  // ---- Perfume: Cham Cham ----
  const oudNoirDoc = await Product.findOne({ slug: "oud-noir" }).select("_id");
  await ensureProduct("cham-cham", {
    type: "perfume",
    name: "Cham Cham by Khizar Omer",
    brand: "Khizar Omer",
    categoryId: floralCategoryId,
    shortDescription: "A festive, spice-laced floral with a warm amber trail.",
    description:
      "Cham Cham opens playful and spiced, unfolding into jasmine and rose over a base of warm amber and vanilla - designed to feel like a celebration.",
    sku: "SCN-PF-1004",
    price: 5250,
    salePrice: null,
    hasVariants: true,
    gender: "unisex",
    fragranceFamily: "Floral",
    primaryMediaType: "image",
    primaryMediaUrl: img("scentisto-chamcham-primary"),
    hoverImageUrl: img("scentisto-chamcham-hover"),
    status: "published",
    isFeatured: true,
    isBestSeller: true,
    showOnHomepage: true,
    metaTitle: "Cham Cham by Khizar Omer | SCENTISTO",
    metaDescription: "Cham Cham - a festive, spice-laced floral fragrance.",
    publishedAt: new Date(),
    collectionIds: [signatureCollectionId],
    variants: [
      {
        label: "50 ML",
        sizeMl: 50,
        price: 5250,
        sku: "SCN-PF-1004-50",
        stock: 65,
        isDefault: true,
        displayOrder: 0,
      },
      {
        label: "100 ML",
        sizeMl: 100,
        price: 8900,
        sku: "SCN-PF-1004-100",
        stock: 22,
        displayOrder: 1,
      },
    ],
    media: [
      {
        mediaType: "image",
        url: img("scentisto-chamcham-gallery-1"),
        altText: "Cham Cham bottle and box",
        displayOrder: 0,
      },
      {
        mediaType: "image",
        url: img("scentisto-chamcham-gallery-2"),
        altText: "Cham Cham lifestyle shot",
        displayOrder: 1,
      },
    ],
    relatedProducts: oudNoirDoc
      ? [
          {
            relatedProductId: oudNoirDoc.id,
            relationType: "recommended",
            displayOrder: 0,
          },
        ]
      : [],
    details: {
      story:
        "A tribute to celebration - Cham Cham is meant to be worn on the nights that matter.",
      longevity: "7-9 hours",
      projection: "Strong",
      season: "All Season",
      occasion: "Celebration, Evening",
      topNotes: ["Cardamom", "Pink Pepper"],
      middleNotes: ["Jasmine", "Rose"],
      baseNotes: ["Amber", "Vanilla"],
    },
  });

  // ---- Bottle: Crystal Noir Bottle ----
  await ensureProduct("crystal-noir-bottle", {
    type: "bottle",
    name: "Crystal Noir Bottle",
    brand: "SCENTISTO",
    categoryId: bottlesCategoryId,
    shortDescription: "A premium crystal glass refillable perfume bottle.",
    description:
      "Hand-finished crystal glass bottle with a magnetic cap and leak-proof sprayer.",
    sku: "SCN-BK-2001",
    price: 24.99,
    hasVariants: true,
    primaryMediaType: "image",
    primaryMediaUrl: img("scentisto-bottle-primary"),
    hoverImageUrl: img("scentisto-bottle-hover"),
    status: "published",
    isNewArrival: true,
    showOnHomepage: true,
    publishedAt: new Date(),
    variants: [
      {
        label: "30ml",
        sizeMl: 30,
        price: 19.99,
        sku: "SCN-BK-2001-30",
        stock: 60,
        isDefault: true,
      },
      {
        label: "50ml",
        sizeMl: 50,
        price: 24.99,
        sku: "SCN-BK-2001-50",
        stock: 45,
      },
      {
        label: "100ml",
        sizeMl: 100,
        price: 32.99,
        sku: "SCN-BK-2001-100",
        stock: 20,
      },
    ],
    media: [
      {
        mediaType: "image",
        url: img("scentisto-bottle-gallery-1"),
        altText: "Crystal Noir bottle detail",
        displayOrder: 0,
      },
    ],
    details: {
      story:
        "Premium glass, timeless elegance - engineered for daily use and gifting.",
    },
  });

  // ---- Gift Pack: Signature Duo ----
  await ensureProduct("signature-duo-gift-set", {
    type: "gift_pack",
    name: "Signature Duo Gift Set",
    brand: "SCENTISTO",
    categoryId: woodyCategoryId,
    shortDescription: "Oud Noir and Arsh, boxed together for gifting.",
    description:
      "Two signature fragrances in a single gift box, ribboned and ready to give.",
    sku: "SCN-GP-3001",
    price: 179.0,
    salePrice: 159.0,
    hasVariants: false,
    primaryMediaType: "image",
    primaryMediaUrl: img("scentisto-giftset-primary"),
    hoverImageUrl: img("scentisto-giftset-hover"),
    status: "published",
    isFeatured: true,
    isGiftEligible: true,
    showOnHomepage: true,
    publishedAt: new Date(),
    media: [
      {
        mediaType: "image",
        url: img("scentisto-giftset-gallery-1"),
        altText: "Signature Duo gift box, open",
        displayOrder: 0,
      },
    ],
    details: {
      story: "Wrapped, boxed, and ready - no extra gift wrap needed.",
    },
  });

  console.log("Sample product data seeded (or already present).");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Product seed failed:", err.message);
  process.exit(1);
});
