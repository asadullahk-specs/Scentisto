# SCENTISTO - Backend & Frontend Build (Phases 0-6b, on MongoDB Atlas)

Enterprise luxury perfume e-commerce platform: public storefront + Admin CMS.
This zip contains **Phase 0** (project scaffold + secure authentication),
**Phase 1** (the product system API), **Phase 2** (the Admin Product Editor
+ Media Library UI), **Phase 3** (the public storefront: homepage, PLP,
PDP, filters, search), **Phase 4** (cart, checkout, and orders), **Phase 5**
(coupons, gift packs, reviews, and the homepage CMS builder), **Phase 6a**
(the Admin Dashboard, analytics, and Activity Log), and **Phase 6b**
(Blogs and Notifications) - each phase builds cleanly on the last.

**Database note:** this build originally used MySQL and was migrated to
**MongoDB Atlas** partway through. Every model, controller, and route below
reflects the MongoDB version - there is no MySQL code left in this zip.
The single largest structural change: ML variants, gallery media, and
long-form details were separate SQL tables joined to `products`; they are
now **embedded** directly inside each product document (see "Why embedding"
under Phase 1). A second, smaller change worth knowing before you read the
code: API responses are camelCase end-to-end now (`categoryId`,
`hasVariants`, `primaryMediaUrl`...) - the old MySQL version used snake_case
column names (`category_id`, `has_variants`...) straight from SQL; MongoDB
has no such constraint, so schema fields, API responses, and the frontend
all agree on one casing.

## Why you can't just unzip-and-run in this sandbox

This was written in a network-isolated container, so `npm install` and a
live Atlas connection were not run or tested here. Every file is real,
production-intent code - you install dependencies and point it at your own
cluster.

### 1. MongoDB Atlas setup (one-time, in the Atlas dashboard)
1. **Database Access** → add a database user with a generated password,
 scoped to this project (not your personal Atlas login).
2. **Network Access** → add your current IP (or `0.0.0.0/0` for local dev
 only - remove before production; see `SECURITY.md` §11).
3. Create a cluster if you don't have one yet, then **Connect → Drivers →
 Node.js** to get your connection string. It looks like:
 ```
 mongodb+srv://<user>:<password>@<cluster-host>/scentisto?retryWrites=true&w=majority
 ```
 URL-encode the password if it contains `@`, `:`, `/`, or other special
 characters.

### 2. Backend
```bash
cd backend
cp .env.example .env # paste your real MONGODB_URI + secrets here
npm install
SEED_ADMIN_EMAIL=you@scentisto.com SEED_ADMIN_PASSWORD='A very strong passphrase 2026!' npm run db:seed-admin
npm run db:seed-products # optional - a few sample perfumes/bottles to explore the API with
npm run db:seed-homepage # optional - a default homepage layout so it isn't blank
npm run dev # http://localhost:5000
```
Indexes (unique slug/SKU, text search, etc.) are built automatically on
connect in development. In production, `autoIndex` is off - run
`npm run db:sync-indexes` once after each deploy instead (building indexes
under production load is best done deliberately, not on every boot).

### 3. Frontend
```bash
cd ../frontend
npm install
npm run dev # http://localhost:5173
```

Visit `http://localhost:5173/register` to create a shopper account, or
`http://localhost:5173/admin/login` with the seeded Super Admin credentials.
Once the backend is running, `curl http://localhost:5000/api/products` will
return the seeded catalog, and `curl http://localhost:5000/api/health`
reports `503` if MongoDB isn't actually connected - a quick way to confirm
Atlas is reachable before chasing anything else.

### Local MongoDB instead of Atlas (optional)
`docker-compose.yml` spins up a local MongoDB container if you want to
develop offline: `docker compose up -d mongo`, then point `MONGODB_URI` at
`mongodb://scentisto_app:change_this_to_a_strong_password@localhost:27017/scentisto?authSource=scentisto`
(see the comment at the top of that file). Not needed if you're using Atlas
directly for dev too.

---

## Phase 0 - Project Scaffold + Secure Authentication

- Two fully isolated logins: `/api/auth/login` (customers) and
 `/api/auth/admin/login` (Admin CMS staff) - both are `User` documents,
 separated by a `scope` field (`storefront` | `admin`), so a leaked
 customer credential can never reach the Admin CMS.
- **Logout on refresh, by design**: no refresh token, nothing ever touches
 `localStorage`/`sessionStorage`/cookies. The access token lives only in
 React state, so any page refresh or new tab forces re-login - on both the
 shopper and the admin side. Full rationale in `SECURITY.md`.
- `/checkout` is unreachable by a guest (`ProtectedRoute` guard); the real
 enforcement moves server-side once order endpoints exist (Phase 4).
- Threat reduction: bcrypt (cost 12), per-account lockout + per-IP rate
 limiting, enumeration-resistant errors, helmet/CORS/HPP/XSS-clean,
 `express-mongo-sanitize` (NoSQL-injection defense - see `SECURITY.md`
 §8), Mongoose schema validation on every write, full login/activity
 audit logging, RBAC roles validated as a schema enum for later phases.
- Luxury white/black design system (Playfair Display + Inter, zero
 border-radius, enforced globally) wired into Tailwind.

Files: `backend/src/{app.js,server.js,config/db.js,middleware,
models/{User,LoginHistory,ActivityLog,userModel}.js,
controllers/authController.js,routes/authRoutes.js,utils/jwt.js,
utils/password.js}`, `frontend/src/{context,components,pages/Login.jsx,
pages/Register.jsx,pages/AdminLogin.jsx}`.

## Phase 1 - Product System

Perfumes, bottles, gift packs, and accessories all live in one `Product`
model (type-discriminated), matching the CMS requirement that "all
categories, gift packs, bottles, perfumes, and accessories are managed from
the same product system." Backend only in this phase - the visual Admin
Product Editor and Media Library UI are Phase 2.

**Why embedding, not references**: ML variants, gallery media, and
long-form details were separate MySQL tables joined to `products` because a
relational row can't hold a variable-length list. In MongoDB they're
embedded arrays/objects directly on the product document - they were always
fetched together with the product anyway, so "get one product with
everything" is now a single document read instead of three joins. Gift pack
contents and related-product curation are embedded arrays for the same
reason. Category/Collection stay as separate collections (referenced by
ObjectId) since those really are independently managed entities.

**Data model** (`backend/src/models/Product.js`): `categories` and
`collections` collections (self-referencing via `parentId` for
subcategories), and one `products` collection where each document embeds
`variants[]` (ML sizes - independently priced/stocked, "or any custom size"
per the spec), `media[]` (unlimited gallery images/videos/360),
`details{}` (story, ingredients, notes, FAQs), `giftPackItems[]` (bundles
referencing other products), `relatedProducts[]`
(frequently-bought-together / recommended / bundles), and `collectionIds[]`
(membership in the separate `collections` collection).

**Google Drive media handling** (`backend/src/utils/media.js`): validates a
submitted URL, auto-detects image vs. video (file extension first, then a
restricted Content-Type probe - allow-listed to Google's own hosts only, to
avoid turning the media-URL field into an SSRF vector against arbitrary
hosts), and rewrites Drive "share" links into directly embeddable URLs
(`uc?export=view&id=...` for images, `/preview` for videos). Matches
Section 24: "Automatic media-type detection (image vs. video)." Unchanged
by the database migration - this logic has nothing to do with storage.

**ML variants**: changing the selected size on a future product page reads
straight from the product's embedded `variants[]` - price, sale price,
stock, SKU are all per-variant, updating "instantly" as the spec requires
simply by being the actual source of truth (no caching/derivation lag).
Variant SKUs are enforced unique across the *entire* products collection via
a sparse unique index on `variants.sku`, not just within one product.

**Filtering/sorting**: the old SQL query with a `HAVING` clause on a derived
`effective_price` is now a MongoDB aggregation pipeline
(`productModel.list`) - `$addFields` computes `effectivePrice` (lowest
visible-variant sale price, or the product's own price for non-variant
items) and `variantStockTotal`, then a second `$match` stage applies the
price-range/in-stock filters, and a `$facet` returns the page of results and
the total count in one round trip.

**API surface**:

| Method | Path | Access |
|---|---|---|
| GET | `/api/products` | Public - filter by type/category/collection/brand/gender/fragranceFamily/ml/price range/in-stock/flags(featured, topSelling, bestSeller, trending, limitedEdition, newArrival, flashSale, homepage)/search; sort by newest/price/popularity/best-selling; paginated |
| GET | `/api/products/:slug` | Public - full product incl. variants, gallery, long-form details, collections, related products; increments view count |
| GET | `/api/categories`, `/api/categories/:slug` | Public |
| GET | `/api/collections` | Public |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/products/*` | Admin session required (`requireAuth` + `requireScope('admin')`); create/update/delete/status/duplicate additionally require `requireRole('super_admin','admin','manager')` |
| `/api/admin/products/:id/variants`, `/media`, `/details`, `/related` | Admin | full CRUD for ML sizes, gallery, long-form content, and related-product curation - all embedded-array mutations on the one Product document |
| `/api/admin/categories`, `/api/admin/collections` | Admin | full CRUD |

Every `:id` is now a MongoDB ObjectId (validated via `isMongoId()` in the
route layer, not the old `isInt()`). All admin write routes log to
`ActivityLog` (who did what, when) - the same collection the Admin CMS's
Activity Logs panel will read from later.

Files: `backend/src/models/{categoryModel,collectionModel,productModel,
productMediaModel,Category,Collection,Product}.js`,
`backend/src/controllers/{categoryController,collectionController,
productController}.js`, `backend/src/routes/{categoryRoutes,
collectionRoutes,productRoutes,adminProductRoutes,adminCatalogRoutes}.js`,
`backend/src/utils/{media,pagination,mongooseHelpers}.js`,
`backend/database/seedProducts.js` (sample data for verification).

## Phase 2 - Admin Product Editor + Media Library

The visual layer on top of Phase 1's API. Every screen lives behind
`AdminProtectedRoute` (Phase 0), inside a new `AdminLayout` sidebar shell
that lists the full CMS module map from the master prompt - Products,
Categories, and Media Library are wired to real screens; every other module
(Orders, Homepage CMS, Offers, Analytics, Settings, etc.) shows as a
disabled "coming in a later phase" link so the complete information
architecture is visible from day one without pretending unbuilt phases work.

- **`/admin/products`** - searchable, filterable (status tabs, type, text
 search), paginated product table with inline Edit / Duplicate / Publish
 or Unpublish / Delete actions.
- **`/admin/products/new`** and **`/admin/products/:id/edit`** - a tabbed
 Product Editor:
 - **General** - type, category, name/slug, SKU/barcode, descriptions,
 base price + "has ML variants" toggle, gender, fragrance family, status,
 and the full flag grid (Featured, Top Selling, Best Seller, Trending,
 Limited Edition, New Arrival, Flash Sale, Homepage, Gift/Coupon
 eligible...).
 - **Media** - primary media URL + type (image/video/auto-detect) with a
 live preview, admin-selected hover image, and an unlimited gallery with
 add/remove, all built on the `MediaUrlField` component that surfaces the
 Phase 1 Google-Drive-link validation/detection before the admin saves.
 - **Variants** - an editable ML-size table (label, size, price, sale
 price, SKU, stock, default-size radio) plus an "Add Variant" form - this
 is the literal ML-pricing/stock source of truth the storefront will read
 from in a later phase.
 - **Details** - story, top/middle/base notes, longevity/projection/
 sillage, season/occasion, ingredients, how-to-use, warnings,
 authenticity/packaging/shipping/returns copy.
 - **SEO** - meta title/description/keywords, canonical URL.
 - New products save the General tab first (creating the document and its
 id); Media/Variants/Details then unlock - matching how the embedded
 sub-arrays can't be pushed to before the parent document exists.
- **`/admin/categories`** - add/list/toggle-visibility/delete for the
 category tree used by the product editor's category dropdown and the
 storefront's future category filters.
- **`/admin/media-library`** - a searchable, paginated grid of every media
 asset currently attached to any product (new `GET
 /api/admin/products/media-library` endpoint, implemented as an
 aggregation `$unwind` over every product's embedded `media[]` array),
 with a link back to the owning product. Scoped to product media in this
 phase; a standalone media-asset entity with folders and cross-page reuse
 tracking (Section 19 of the CMS spec) is a larger data-model change that
 lands with the Homepage CMS / Blog phase.

Files: `frontend/src/api/adminApi.js`, `frontend/src/components/admin/
{AdminLayout,StatusBadge,Pagination,MediaUrlField}.jsx`,
`frontend/src/components/admin/product-editor/{GeneralTab,MediaTab,
VariantsTab,DetailsTab,SeoTab}.jsx`, `frontend/src/pages/admin/
{AdminProducts,AdminProductEditor,AdminCategories,AdminMediaLibrary}.jsx`,
plus `backend/src/models/productMediaModel.js` (`listAllAdmin`) and the
`GET /admin/products/media-library` route/controller for the aggregated view.

## Phase 3 - Public Storefront

The customer-facing side of the Phase 1 API - no backend changes this
phase, purely consuming `/api/products`, `/api/categories`,
`/api/collections` as a signed-out shopper would.

- **Homepage** (`/`) - hero, "Shop by Category" (pulled from
 `/api/categories`, flattened client-side), Best Sellers and New
 Arrivals rails (filtered by the `isBestSeller`/`isNewArrival` flags set
 in the Phase 2 Product Editor), and a newsletter signup form. If no
 products are flagged yet, each rail says so explicitly instead of
 silently rendering empty - a reminder that this section is Admin-driven,
 not hardcoded.
- **Product Listing Pages** - one reusable `ProductListing` component
 powers `/perfumes`, `/bottles`, `/gift-sets`, `/new-arrivals`,
 `/best-sellers`, `/offers`, `/collections/:slug`, and `/search`, each
 just passing different fixed filters (`{ type: 'perfume' }`,
 `{ bestSeller: true }`, etc.) on top of whatever the shopper picks in
 the sidebar (category, price range, fragrance family, gender, in-stock).
 Sorting (newest/price/popularity/best-selling) and pagination are wired
 straight to the Phase 1 aggregation-pipeline API.
- **Product Detail Page** (`/product/:slug`) - media gallery with
 thumbnail switching (respects the image/video primary-media +
 admin-selected hover-image behavior from the spec), ML size selector
 that swaps price/stock instantly since it's just selecting a different
 embedded variant already returned with the product, description/
 fragrance-notes/details/shipping tabs, and a "You May Also Like" rail
 from the Phase 1 `recommended` related-products relation.
- **Product Card** (`components/public/ProductCard.jsx`) - the shared
 card used on the homepage, every listing page, and the PDP's related
 rail. Implements the spec's card media rule precisely: an image
 product swaps to the admin-selected hover image on hover; a video
 product autoplays and swaps to the hover image on hover.
- **Header/Footer/Contact** - full navigation matching the mega-menu
 structure (Perfumes, Bottles, Gift Sets, New Arrivals, Best Sellers,
 Offers, Contact), a search box wired to `/search?q=`, and a static
 Contact page (the CMS-managed subject dropdown and a real submission
 endpoint land with the Content Management phase - this one is
 structurally correct but doesn't persist yet, and says so).
- **"Add to Cart" is intentionally inert this phase** - it confirms the
 product/variant selection with a visible state change but doesn't
 persist anything, and says as much on the page. Cart and checkout are
 Phase 4; `/checkout` still requires login exactly as it did in Phase 0,
 it just has real products to reach it from now.

Files: `frontend/src/api/publicApi.js`, `frontend/src/components/public/
{ProductCard,Footer,FilterSidebar,Pagination}.jsx`,
`frontend/src/pages/{Home,ProductListing,CollectionListing,ProductDetail,
Contact}.jsx`, rewritten `frontend/src/components/Header.jsx`.

## Phase 4 - Cart, Checkout & Orders

The "Add to Cart" from Phase 3 is now real, checkout actually places an
order, and orders are manageable from the Admin CMS. This is also where
"no checkout without login" gets its real, server-side teeth - Phase 0's
`ProtectedRoute` was always a UX convenience; from this phase on,
`POST /api/orders` independently enforces the same rule with
`requireAuth` + `requireScope('storefront')`, so there's no way to place
an order without a valid session even if the frontend guard were bypassed.

**Guest cart, then merge on login**: a cart is not sensitive data, so
unlike the auth token it's fine to keep client-side - a signed-out
shopper's cart lives in `localStorage` (`CartContext.jsx`). The moment
they log in, whatever was in that local cart is sent to
`POST /api/cart/merge` and folded into their real, server-side `Cart`
document; from then on the server is the source of truth for that
session. A page refresh still logs them out per the Phase 0 design, but
the *cart* itself isn't lost - next login re-fetches it from the
database, only the auth session resets.

**Cart pricing is always live, order pricing is always frozen**: a `Cart`
document only stores `productId` + `variantId` + `quantity` - every time
it's fetched, `cartModel.getEnriched` looks up the *current* product/
variant price and stock and builds the response fresh, so a price change
or a variant going out of stock shows up immediately. The moment an order
is placed, though, every line item snapshots the product name, variant
label, SKU, unit price, and image onto the `Order` document permanently - 
a later product edit, price change, or even deletion can never alter what
a past order shows the customer they paid.

**Order placement is transactional**: `orderModel.createOrderFromCart`
runs inside a MongoDB session (`session.withTransaction`, available
because Atlas clusters are replica sets even on the free tier) because it
touches three things that must succeed or fail together - decrementing
stock on each purchased variant, creating the `Order` document, and
clearing the cart. Stock is decremented with a conditional filter
(`"variants.stock": { $gte: quantity }`) rather than a plain `$inc`, so
two customers racing for the last unit can't both succeed: the loser's
update matches zero documents and the whole transaction aborts with a
clear "out of stock" error instead of silently overselling. Order numbers
(`SCNT10001`, `SCNT10002`, ...) come from an atomic `Counter` document
(`findOneAndUpdate($inc, upsert)`), which is what actually guarantees no
two orders can ever collide on a number under concurrent checkouts - a
timestamp-based id could not guarantee that.

**Payment is Cash on Delivery only**, matching the reference checkout
design - a real gateway (Stripe/Easypaisa/JazzCash per the Settings spec)
is a Settings → Payments integration for a later phase, not something to
fake here. Tax is a flat `0` for the same reason (no Tax Rules module
yet); shipping is a simple flat-fee-or-free-over-threshold rule
(`FREE_SHIPPING_THRESHOLD` / `FLAT_SHIPPING_COST` in `.env`), not the full
Shipping Zones module from the spec.

**Customer-facing**: `/cart` (guest-or-logged-in), `/checkout` (shipping
address form - first/last name, phone, email, country/city/state, one
"Complete Address" field with no separate ZIP or apartment field, per the
spec - and order summary), `/orders` (order history), `/orders/:id`
(order detail / confirmation).

**Admin-facing** (`/admin/orders`, `/admin/orders/:id`): searchable,
status-filterable order list; a detail view with items, shipping address,
a full status-change timeline, and a form to update status (through the
complete state machine from Section 22 - pending → confirmed →
processing → packed → ready to ship → shipped → out for delivery →
delivered, plus cancelled/returned/refunded/failed payment), tracking
number, and courier company. Status-changing actions are restricted to
roles that actually handle fulfillment (`super_admin`, `admin`,
`manager`, `warehouse`, `customer_support`); any admin-scope staff member
can view.

**A latent bug fixed in passing**: Express 4 doesn't automatically catch
a rejected promise inside an `async` route handler - none of the earlier
phases' controllers threw custom errors, so this never surfaced, but
`cartModel`/`orderModel` now deliberately throw (e.g. "out of stock") and
need to reach the central error handler. Added `utils/asyncHandler.js`
and wrapped every Phase 4 route with it; the same wrapper is available
for a full retrofit onto Phases 0-3's routes whenever that's worth doing.
Also fixed while touching the error handler: it was masking every error
message in production, including deliberate, safe-to-show 4xx business
errors like "out of stock" - now only unexpected 5xx failures are
masked.

Files: `backend/src/models/{Cart,Order,Counter,cartModel,orderModel}.js`,
`backend/src/controllers/{cartController,orderController}.js`,
`backend/src/routes/{cartRoutes,orderRoutes,adminOrderRoutes}.js`,
`backend/src/utils/asyncHandler.js`, `frontend/src/context/CartContext.jsx`,
`frontend/src/api/{cartApi,ordersApi}.js`, `frontend/src/pages/{Cart,
OrderHistory,OrderDetail}.jsx`, rewritten `frontend/src/pages/Checkout.jsx`,
`frontend/src/pages/admin/{AdminOrders,AdminOrderDetail}.jsx`.

## Phase 5 - Offers/Coupons, Gift Packs, Reviews, Homepage CMS

Four subsystems, tied together by the same theme as every prior phase: the
Admin CMS controls real data, the storefront renders exactly that data,
nothing is hardcoded that the spec says should be editable.

**Coupons** - code-based discounts (`Coupon` model): percentage, fixed
amount, or free shipping, with an active window, a minimum order value, a
total usage cap, and a per-customer usage cap, optionally scoped to
specific products/categories. `couponModel.computeForCart` is the single
place that decides whether a code is valid for a given cart - the same
function backs both the checkout-page *preview* (`POST
/api/coupons/validate`, read-only) and the actual *application* inside
`orderModel.createOrderFromCart`'s transaction (which also increments
usage), so preview and reality can never disagree. On the storefront,
Checkout has a coupon field with a live discount preview before the order
is placed; the applied discount and code are stored on the `Order` and
shown on both the customer's order page and the Admin order detail view.

**Gift Packs** - turned out to already be structurally supported since
Phase 1 (`Product.giftPackItems[]`, a `gift_pack` product type). This
phase adds the missing pieces: a **Gift Pack** tab in the Admin Product
Editor (shown only when Product Type is "Gift Pack") to pick which other
published products are included and in what quantity, and a "What's
Included" block on the PDP that links each contained product back to its
own page.

**Reviews** - customers can submit a rating + review (only if logged in)
from the PDP; server-side validation enforces the spec's length rule
(minimum 150 characters without a photo, 80 with one) regardless of what
the form sends, and every review starts `pending` until an Admin approves
it - nothing appears on the storefront unmoderated. The PDP shows a
rating average, a star-by-star breakdown bar chart, and the approved
reviews (with the Admin's reply, if any). Admin → Reviews is a moderation
queue: approve/reject/feature/reply/delete, filterable by status.

**Homepage CMS Builder** - `HomepageSection` documents each hold a `type`
(hero, offer banner, featured products, collections, brand story,
testimonials, Instagram-style image grid, or newsletter), an `isEnabled`
flag, a `displayOrder`, and a `content` object shaped for that type. Admin
→ Homepage CMS lists every section with up/down reordering, an
enable/disable toggle, and an edit form that adapts to the section's type
 - including product/collection multi-select pickers backed by the real
catalog. The public `GET /api/homepage` endpoint doesn't just return that
raw content, though: a resolver turns a "Featured Products" section's
admin-picked product ids (or, if none were picked, an auto flag-based
fallback like "best sellers") into actual current product data, turns
collection ids into real collection documents, and turns "Testimonials"
into the most recent approved-and-featured reviews - so the homepage
always reflects the live catalog, never a stale snapshot. `Home.jsx` on
the frontend is now a pure renderer over whatever sections come back;
there is no hardcoded homepage layout left. `npm run db:seed-homepage`
seeds a sensible starting layout (hero, best sellers, new arrivals,
featured collections, testimonials, newsletter) so a fresh install isn't
blank - everything after that is managed entirely from the Admin CMS.

Files: `backend/src/models/{Coupon,couponModel,Review,reviewModel,
HomepageSection,homepageSectionModel}.js`, `backend/src/controllers/
{couponController,reviewController,homepageSectionController}.js`,
`backend/src/routes/{couponRoutes,adminCouponRoutes,reviewRoutes,
adminReviewRoutes,homepageRoutes,adminHomepageRoutes}.js`,
`backend/database/seedHomepage.js`, `frontend/src/api/{adminApi additions,
publicApi additions, ordersApi:couponApi}`, `frontend/src/pages/admin/
{AdminCoupons,AdminReviews,AdminHomepageCMS}.jsx`,
`frontend/src/components/admin/{ProductMultiSelect,CollectionMultiSelect,
SectionContentEditor,product-editor/GiftPackTab}.jsx`,
`frontend/src/components/public/{ReviewsSection,GiftPackContents,
HomeSection}.jsx`, rewritten `frontend/src/pages/Home.jsx`, coupon field
added to `frontend/src/pages/Checkout.jsx`.

---

## Project structure

```
scentisto/
 docker-compose.yml # optional local MongoDB for offline development
 SECURITY.md # defense-by-defense writeup, incl. NoSQL injection
 # and Atlas infra hardening
 backend/
 database/
 seedAdmin.js # creates the first Super Admin - npm run db:seed-admin
 seedProducts.js # sample categories/collections/products
 seedHomepage.js # default homepage layout - npm run db:seed-homepage
 syncIndexes.js # explicit index build for production - npm run db:sync-indexes
 src/
 config/db.js # Mongoose/Atlas connection
 middleware/ # auth.js, rateLimiter.js, validate.js
 models/ # User, LoginHistory, ActivityLog, Category,
 # Collection, Product, Cart, Order, Counter,
 # Coupon, Review, HomepageSection (schemas) +
 # userModel, categoryModel, collectionModel,
 # productModel, productMediaModel, cartModel,
 # orderModel, couponModel, reviewModel,
 # homepageSectionModel, analyticsModel,
 # blogModel, notificationModel (thin wrappers)
 utils/ # jwt.js, password.js, media.js, pagination.js,
 # mongooseHelpers.js (id-field transform),
 # asyncHandler.js
 controllers/ # authController, categoryController,
 # collectionController, productController,
 # cartController, orderController,
 # couponController, reviewController,
 # homepageSectionController, analyticsController,
 # blogController, notificationController
 routes/ # authRoutes, categoryRoutes, collectionRoutes,
 # productRoutes, adminProductRoutes,
 # adminCatalogRoutes, cartRoutes, orderRoutes,
 # adminOrderRoutes, couponRoutes, adminCouponRoutes,
 # reviewRoutes, adminReviewRoutes, homepageRoutes,
 # adminHomepageRoutes, adminAnalyticsRoutes,
 # blogRoutes, adminBlogRoutes, adminNotificationRoutes
 app.js
 server.js
 .env.example
 package.json
 frontend/
 src/
 api/ # apiClient.js, adminApi.js, publicApi.js,
 # cartApi.js, ordersApi.js (incl. couponApi)
 context/ # createAuthContext.jsx + Customer/Admin variants,
 # CartContext.jsx
 components/
 admin/ # AdminLayout, StatusBadge, Pagination, MediaUrlField,
 # ProductMultiSelect, CollectionMultiSelect,
 # SectionContentEditor
 product-editor/ # GeneralTab, MediaTab, VariantsTab, DetailsTab,
 # SeoTab, GiftPackTab
 public/ # ProductCard, Footer, FilterSidebar, Pagination,
 # ReviewsSection, GiftPackContents, HomeSection
 ProtectedRoute.jsx, AdminProtectedRoute.jsx, Header.jsx
 pages/
 admin/ # AdminDashboard, AdminActivityLog, AdminProducts,
 # AdminProductEditor, AdminCategories,
 # AdminMediaLibrary, AdminOrders, AdminOrderDetail,
 # AdminCoupons, AdminReviews, AdminHomepageCMS,
 # AdminBlogs, AdminBlogEditor
 Home.jsx (dynamic CMS renderer), ProductListing.jsx, CollectionListing.jsx,
 Blog.jsx, BlogPost.jsx,
 ProductDetail.jsx, Contact.jsx, Cart.jsx, Checkout.jsx,
 OrderHistory.jsx, OrderDetail.jsx, Login.jsx, Register.jsx,
 AdminLogin.jsx, AdminDashboardStub.jsx
 styles/index.css # design-system tokens + admin surface utility classes
 App.jsx, main.jsx
 tailwind.config.js
 package.json
```

## Phase 6a - Admin Dashboard, Analytics & Activity Log

The first slice of Phase 6: a real `/admin/dashboard` (replacing the Phase
2 placeholder) plus a full Activity Log screen. No new collections - 
everything is read straight off `Order`, `User`, `Product`, and the
`ActivityLog` documents every admin write has already been logging since
Phase 0.

**Why one combined page instead of separate "Dashboard" and "Analytics"
screens**: the CMS module map (Phase 2's sidebar) originally listed them
separately, but a KPI-cards-plus-charts dashboard *is* the analytics
view - splitting them would just mean two screens querying the same
data. The sidebar's old "Analytics" placeholder link is gone;
`/admin/dashboard` is both now.

- **KPI cards** - revenue, orders, average order value, and new
 customers, each compared against the immediately preceding period of
 equal length (last 30 days vs. the 30 days before that, etc.), plus a
 point-in-time low-stock count. Revenue and AOV deliberately exclude
 `cancelled`/`failed_payment` orders - counting money that was never
 actually collected would overstate the number. A period with no prior
 baseline (e.g. a brand-new store) shows "New" instead of a misleading
 "+∞%".
- **Revenue chart** - daily revenue over the selected window (7/30/90
 days), gap-filled so days with zero orders still show as zero rather
 than a break in the line.
- **Orders by status**, **Top Products** (by revenue, read off order
 line-item snapshots so it's accurate for the selected date range, not
 `Product.salesCount`'s lifetime total), and **Low Stock** (every
 visible variant on a published product at or under its own
 `reorderLevel`) as three supporting cards.
- **Recent Activity** - the last 12 `ActivityLog` entries inline on the
 dashboard, linking out to the full **Activity Log** page
 (`/admin/activity-log`): paginated, filterable by action prefix
 (`auth.`, `product.`, `order.`...), and each row expands to show the
 logged `previousValue`/`newValue` diff for that write. Restricted to
 `super_admin`/`admin`/`manager` - more sensitive than the summary
 dashboard, which any admin-scope staff member can view (same
 read-access convention as `GET /admin/orders`).

`GET /api/admin/analytics/dashboard?days=7|30|90` and
`GET /api/admin/analytics/activity-log` are the two new endpoints;
`backend/src/models/analyticsModel.js` holds every aggregation
(`$facet` for the current-vs-previous KPI comparison in one round trip,
`$unwind`+`$group` for top products and low stock). The dashboard's
chart uses `recharts` (new frontend dependency - run `npm install`
again after pulling this phase).

## Phase 6b - Blogs & Notifications

The second Phase 6 slice: a full editorial Blogs feature (public
Journal + Admin CRUD) and an in-app staff notification system, wired
into the events that already happen elsewhere in the app rather than
inventing new ones to notify about.

**Blogs** - a standalone `Blog` entity (not a Product variant): title,
slug, excerpt, HTML/markdown body, a Google-Drive `featuredImageUrl`
(reusing `utils/media.js` - the same media pipeline products and
homepage sections already use), tags, `draft`/`published` status, and
SEO meta fields. `publishedAt` is set once, the first time a post goes
live, so later draft↔published toggles don't reset "published on."

- Admin: `/admin/blogs` (list, filter by status, search) and
 `/admin/blogs/:id/edit` - write access gated to
 `super_admin`/`admin`/`marketing`/`content_editor`, delete further
 restricted to `super_admin`/`admin`, same layered-permission pattern
 as Categories/Coupons.
- Storefront: `/blog` (the "Journal" grid, tag-filterable) and
 `/blog/:slug` - both linked from the header nav and footer. Post
 content is rendered as raw HTML; this is safe because it's
 exclusively admin-authored (create/edit is behind `requireRole`)
 and never touches user-submitted input, the same trust boundary
 every other admin-authored field in this app already has.
- `GET /api/blogs`, `GET /api/blogs/:slug` (public, published-only) and
 the `/api/admin/blogs/*` CRUD + `PATCH /:id/status`.

**Notifications** - a lightweight staff inbox (`Notification` model,
bell icon in the Admin header, polls every 30s), not a new event
system: it hooks into two things that already happen - 
`order.create` and `review.create` - and fires a best-effort,
non-blocking broadcast to the staff roles who'd act on it (fulfillment
roles for a new order, moderation roles for a new review). A
notification is a broadcast to a set of roles *or* a direct message to
one user; `readBy` tracks per-recipient read state since a broadcast
has more than one recipient who each dismiss it independently.
Deliberately **not** wired to low-stock - that's already visible on
the Dashboard (Phase 6a) as a live count, and firing a push
notification on every order that dips a variant below its reorder
level would just be dashboard noise duplicated as alerts.

- `GET /api/admin/notifications`, `GET /api/admin/notifications/unread-count`,
 `PATCH /api/admin/notifications/:id/read`,
 `PATCH /api/admin/notifications/read-all` - no extra role gate beyond
 `requireScope("admin")`, since every staff member only ever sees
 their own inbox.

Files: `backend/src/models/{Blog,blogModel,Notification,notificationModel}.js`,
`backend/src/controllers/{blogController,notificationController}.js`,
`backend/src/routes/{blogRoutes,adminBlogRoutes,adminNotificationRoutes}.js`,
edits to `orderController.js`/`reviewController.js` (the two notify hooks),
`frontend/src/pages/{Blog,BlogPost}.jsx`,
`frontend/src/pages/admin/{AdminBlogs,AdminBlogEditor}.jsx`,
`frontend/src/components/admin/NotificationBell.jsx`, and the usual
`adminApi.js`/`publicApi.js`/`App.jsx`/nav updates.

**Still open from the original Phase 6 list**: Settings and the RBAC
permission-matrix UI, and backups. Each is independent enough to ship
as its own follow-up slice.

## Phase 6b.1 - Product Card Hover Actions, Urgency Badges & Demo Content

A small polish pass on top of Phase 6b, adding the storefront trust
signals and hover interactions common to e-commerce PDPs/grids, plus
real placeholder imagery so the whole build previews properly instead
of showing broken image links.

- **"N people are viewing this right now" / "N bought in the last 24
 hours"** on the product detail page. The purchase count is real - 
 an aggregation over order line items in the last 24h, same
 non-revenue-status exclusion used everywhere else in this app. The
 viewer count is a genuine (not simulated) in-memory presence
 tracker (`utils/presenceTracker.js`): the PDP sends a heartbeat on
 mount and every 20s via `POST /api/products/:slug/presence`, and
 the count is everyone whose heartbeat hasn't expired. It's
 per-process, not persisted to Mongo - deliberately, the same
 reasoning that already justifies memory-only JWTs (SECURITY.md) - 
 so on a multi-instance deployment this becomes a per-instance
 count. Fine for a marketing signal; would not be fine if anything
 else depended on it.
- **Product card hover overlay**: Quick View (top-right, opens
 `QuickViewModal` - full product fetch, size picker, add to cart,
 without leaving the grid) and Add to Cart (bottom bar). A
 variant-less product quick-adds directly from the card; a product
 with sizes opens Quick View instead, since hovering alone doesn't
 say which size the visitor wants - matches how the reference layout
 behaves.
- **Demo content**: `database/seedProducts.js`, `seedHomepage.js`, and
 the new `seedBlogs.js` (`npm run db:seed-blogs`) now use real,
 working Picsum Photos placeholder images (free, no licensing
 concerns) instead of unresolvable fake Google Drive IDs - every
 product, category, collection, hero banner, offer banner, brand
 story, and blog post has an actual image so the site can be
 previewed properly. These are placeholders, not real product
 photography - swap them from the Admin CMS whenever real photos are
 ready; nothing about seed data is special-cased in the app itself.
 The catalog also now includes **Mehkal**, **Arsh**, and **Cham Cham
 by Khizar Omer**, matching the reference screenshots, so the demo
 preview lines up with what was being compared against.

**On "Elementor Pro friendly"**: this wasn't attempted, and won't be
 - Elementor is a WordPress page-builder plugin; it runs inside
WordPress's PHP/MySQL stack and has no integration path into a
custom Node/Express + React/Vite application like this one. There
isn't a partial or compatibility-mode version of this that's
possible. If the goal behind that request is drag-and-drop visual
control over page layout, that's what **Admin → Homepage CMS**
(Phase 5) already does - reorderable, toggleable sections
(hero/banner/featured-products/collections/brand-story/testimonials/
newsletter) editable without touching code. If something else was
meant, it needs to be described in non-Elementor terms to be buildable
here.

Files: `backend/src/utils/presenceTracker.js`,
`backend/src/models/productModel.js` (`getPurchasesLast24h`),
`backend/src/controllers/productController.js` (`heartbeatPresence`,
enriched `getPublicBySlug`), `backend/src/routes/productRoutes.js`,
`backend/database/{seedProducts,seedHomepage}.js` (rewritten),
`backend/database/seedBlogs.js` (new),
`frontend/src/components/public/{ProductCard,QuickViewModal}.jsx`,
`frontend/src/pages/ProductDetail.jsx`, `frontend/src/api/publicApi.js`.

## Next phases (proposed order)

6c. Settings + RBAC permission-matrix UI
6d. Activity log retention/backups tooling

Each phase ships as its own verifiable zip, building on this one.
