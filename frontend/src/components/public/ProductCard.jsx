import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import QuickViewModal from "./QuickViewModal";
import { formatPrice } from "../../utils/currency";
import { imageProps, videoPosterUrl } from "../../utils/media";

const FLAG_BADGES = [
  ["isNewArrival", "New"],
  ["isFlashSale", "Sale"],
  ["isTrending", "Trending"],
  ["isLimitedEdition", "Limited"],
  ["isBestSeller", "Best Seller"],
];

/**
 * Product Card System (public master prompt, Section 12).
 *
 * Three defects are fixed here, all of which made the card behave
 * differently from how it was designed to:
 *
 * 1. TOUCH. Quick View and Add to Cart were driven purely by
 *    onMouseEnter/onMouseLeave and rendered at opacity-0 /
 *    translate-y-full until hovered. A touch device fires no
 *    mouseenter before the tap is consumed by the surrounding link,
 *    so on every phone and tablet both actions were invisible AND
 *    unreachable - the card's only behaviour was "navigate". The
 *    actions are now permanently visible below the `xs` breakpoint
 *    and keep the hover reveal from `xs` up, where a real pointer
 *    exists.
 *
 * 2. NESTED INTERACTIVE ELEMENTS. Both buttons were <button>s inside
 *    an <a>, which is invalid HTML and relies on preventDefault to
 *    stop navigation. The link is now a stretched overlay sibling of
 *    the buttons instead, so no element is nested inside another.
 *
 * 3. VIDEO COST. A card whose primary media is a video mounted a
 *    Google Drive /preview <iframe> immediately - an entire embedded
 *    player, per card, on the homepage and shop grid. Cards now show
 *    a still poster frame; the player is only ever mounted on the
 *    product detail page.
 */
export default function ProductCard({ product, imageSizes }) {
  const { addItem } = useCart();
  const [hovered, setHovered] = useState(false);
  const [cartState, setCartState] = useState("idle"); // idle | adding | added | error
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const badge = FLAG_BADGES.find(([key]) => product[key]);
  const hasSale =
    product.salePrice != null &&
    Number(product.salePrice) < Number(product.price ?? product.effectivePrice);

  const isVideo = product.primaryMediaType === "video" && product.primaryMediaUrl;

  // For a video card the displayed still is, in order of preference:
  // the admin-chosen hover image, then a generated poster frame from
  // the video itself.
  const displayUrl = isVideo
    ? product.hoverImageUrl || videoPosterUrl(product.primaryMediaUrl, 640)
    : (hovered && product.hoverImageUrl) || product.primaryMediaUrl;

  async function handleCartButtonClick() {
    if (product.hasVariants) {
      // Can't quick-add a specific size from the grid - Quick View
      // lets the visitor pick one instead of guessing for them.
      setQuickViewOpen(true);
      return;
    }
    setCartState("adding");
    try {
      await addItem(product, null, 1);
      setCartState("added");
      setTimeout(() => setCartState("idle"), 1500);
    } catch {
      // Previously this silently reset to "idle", so a failed add
      // was indistinguishable from never having clicked.
      setCartState("error");
      setTimeout(() => setCartState("idle"), 2500);
    }
  }

  const cartLabel = {
    adding: "Adding...",
    added: "Added ✓",
    error: "Try again",
    idle: product.hasVariants ? "Choose Size" : "Add to Cart",
  }[cartState];

  return (
    <>
      <div
        className="group relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-[4/5] bg-surface border border-border overflow-hidden mb-3">
          {/* Stretched link: covers the image area for navigation but
              sits below the action buttons in the stacking order. */}
          <Link
            to={`/product/${product.slug}`}
            className="absolute inset-0 z-0"
            aria-label={product.name}
          />

          {badge && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 badge bg-bg pointer-events-none">
              {badge[1]}
            </span>
          )}

          {isVideo && (
            <span className="absolute bottom-2 left-2 z-20 badge bg-bg/90 pointer-events-none">
              Video
            </span>
          )}

          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            /* Tailwind scans source text for complete class names, so
               the breakpoint prefix and the utility must appear
               together in one literal - `xs:${cond}` would never be
               generated. Base is opacity-100 (always visible on
               touch); the xs: variants take over on pointer devices. */
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-9 h-9 flex items-center justify-center bg-bg/90 border border-border transition-opacity duration-200 hover:bg-bg opacity-100 focus-visible:opacity-100 ${
              hovered ? "xs:opacity-100" : "xs:opacity-0"
            }`}
            aria-label={`Quick view ${product.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {displayUrl && !imageFailed ? (
            <img
              {...imageProps(displayUrl, {
                width: 640,
                sizes:
                  imageSizes ||
                  "(min-width: 1280px) 280px, (min-width: 768px) 30vw, 46vw",
                maxWidth: 768,
              })}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
              onError={() => setImageFailed(true)}
            />
          ) : (
            // A broken media URL used to hide the <img> via inline
            // styles, leaving an unexplained empty box. An explicit
            // placeholder keeps the grid legible instead.
            <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-luxury text-ink/30">
              Image unavailable
            </div>
          )}

          <button
            type="button"
            onClick={handleCartButtonClick}
            disabled={cartState === "adding"}
            className={`absolute left-0 right-0 bottom-0 z-20 bg-ink text-bg text-[11px] sm:text-xs uppercase tracking-luxury py-3 min-h-[44px] transition-all duration-200 disabled:opacity-60 translate-y-0 opacity-100 ${
              hovered
                ? "xs:translate-y-0 xs:opacity-100"
                : "xs:translate-y-full xs:opacity-0"
            }`}
          >
            {cartLabel}
          </button>
        </div>

        <Link to={`/product/${product.slug}`} className="block">
          <h3 className="text-sm mb-1 clamp-2 group-hover:underline">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-baseline flex-wrap gap-x-2 text-sm">
          <span>
            {formatPrice(
              product.effectivePrice ?? product.salePrice ?? product.price,
            )}
          </span>
          {hasSale && (
            <span className="text-ink/40 line-through text-xs">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>

      {quickViewOpen && (
        <QuickViewModal
          slug={product.slug}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
