import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import QuickViewModal from "./QuickViewModal";
import { formatPrice } from "../../utils/currency";

const FLAG_BADGES = [
  ["isNewArrival", "New"],
  ["isFlashSale", "Sale"],
  ["isTrending", "Trending"],
  ["isLimitedEdition", "Limited"],
  ["isBestSeller", "Best Seller"],
];

/**
 * Product Card System (public master prompt, Section 12):
 * - primaryMediaType 'image' -> show primaryMediaUrl, swap to
 * hoverImageUrl on hover.
 * - primaryMediaType 'video' -> autoplay primaryMediaUrl, swap to
 * hoverImageUrl on hover.
 * Both media choices are entirely Admin-selected (Phase 2 editor).
 *
 * On hover, an overlay surfaces two quick actions without leaving
 * the grid: Quick View (top-right, opens QuickViewModal) and Add to
 * Cart (bottom bar). Add to Cart only quick-adds when the product has
 * no variants to choose between - with variants, hovering doesn't
 * carry enough information to know which size the visitor wants, so
 * the button opens Quick View instead, where a size can be picked.
 */
export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [hovered, setHovered] = useState(false);
  const [cartState, setCartState] = useState("idle"); // idle | adding | added
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const badge = FLAG_BADGES.find(([key]) => product[key]);
  const hasSale =
    product.salePrice != null &&
    Number(product.salePrice) < Number(product.price ?? product.effectivePrice);

  async function handleCartButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      // Can't quick-add a specific size from the grid - Quick View lets
      // the visitor pick one instead of guessing on their behalf.
      setQuickViewOpen(true);
      return;
    }
    setCartState("adding");
    try {
      await addItem(product, null, 1);
      setCartState("added");
      setTimeout(() => setCartState("idle"), 1500);
    } catch {
      setCartState("idle");
    }
  }

  function handleQuickViewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  }

  return (
    <>
      <Link
        to={`/product/${product.slug}`}
        className="block group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-[4/5] bg-surface border border-border overflow-hidden mb-3">
          {badge && (
            <span className="absolute top-3 left-3 z-10 badge bg-bg">
              {badge[1]}
            </span>
          )}

          {/* Quick View - top-right, fades in on hover */}
          <button
            onClick={handleQuickViewClick}
            className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-bg/90 border border-border transition-opacity duration-200 hover:bg-bg ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
            aria-label={`Quick view ${product.name}`}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {product.primaryMediaType === "video" && product.primaryMediaUrl ? (
            hovered && product.hoverImageUrl ? (
              <img
                src={product.hoverImageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <iframe
                src={product.primaryMediaUrl}
                title={product.name}
                className="w-full h-full pointer-events-none"
                allow="autoplay"
              />
            )
          ) : (
            <img
              src={
                (hovered && product.hoverImageUrl) ||
                product.primaryMediaUrl ||
                ""
              }
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          )}

          {/* Add to Cart - bottom bar, slides up on hover */}
          <button
            onClick={handleCartButtonClick}
            disabled={cartState === "adding"}
            className={`absolute left-0 right-0 bottom-0 z-10 bg-ink text-bg text-xs uppercase tracking-luxury py-3 transition-all duration-200 ${
              hovered
                ? "translate-y-0 opacity-100"
                : "translate-y-full opacity-0"
            }`}
          >
            {cartState === "adding"
              ? "Adding..."
              : cartState === "added"
                ? "Added ✓"
                : "Add to Cart"}
          </button>
        </div>

        <h3 className="text-sm mb-1 group-hover:underline">{product.name}</h3>
        <div className="flex items-center gap-2 text-sm">
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
      </Link>

      {quickViewOpen && (
        <QuickViewModal
          slug={product.slug}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
