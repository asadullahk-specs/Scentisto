import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicProductsApi } from "../../api/publicApi";
import { useCart } from "../../context/CartContext";
import { formatPrice } from "../../utils/currency";
import { imageProps } from "../../utils/media";

export default function QuickViewModal({ slug, onClose }) {
  const { addItem } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [cartState, setCartState] = useState("idle");
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicProductsApi
      .getBySlug(slug)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const defaultVariant =
          res.variants?.find((v) => v.isDefault) || res.variants?.[0];
        setSelectedVariantId(defaultVariant?.id || null);
      })
      // There was no .catch here at all. A failed request produced an
      // unhandled rejection and left `loading` true forever, so the
      // modal sat on "Loading..." with no error and no way to retry -
      // only the close button worked.
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  // Lock the page behind the modal. Without this, scrolling inside a
  // short modal chains to the document and the shopper loses their
  // place in the grid underneath.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const selectedVariant =
    data?.variants?.find((v) => v.id === selectedVariantId) || null;
  const price = selectedVariant ? selectedVariant.price : data?.product?.price;
  const salePrice = selectedVariant
    ? selectedVariant.salePrice
    : data?.product?.salePrice;
  const displayPrice = salePrice ?? price;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      {/* The close button was inside the scrolling container, so it
          scrolled out of reach on a small screen. It is now a sibling
          of the scroll area and stays pinned. The panel is also a
          bottom sheet below sm, which is both easier to reach
          one-handed and avoids the cramped 85vh box on short phones. */}
      <div
        className="bg-bg w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-10 h-10 flex items-center justify-center bg-bg border border-border hover:bg-surface"
          aria-label="Close quick view"
        >
          ✕
        </button>

        <div className="overflow-y-auto overscroll-contain">
        {error ? (
          <div className="p-10 sm:p-16 text-center">
            <p className="text-sm text-ink/60 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-outline"
            >
              Try Again
            </button>
          </div>
        ) : loading || !data ? (
          <p className="text-sm text-ink/40 p-10 sm:p-16 text-center">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="aspect-[5/4] sm:aspect-square bg-surface overflow-hidden">
              {data.product.primaryMediaUrl && (
                <img
                  {...imageProps(data.product.primaryMediaUrl, {
                    width: 768,
                    sizes: "(min-width: 768px) 384px, 100vw",
                    maxWidth: 1024,
                  })}
                  alt={data.product.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-5 sm:p-8">
              <p className="text-xs uppercase tracking-luxury text-ink/50 mb-2">
                {data.product.brand}
              </p>
              <h2 className="text-xl sm:text-2xl mb-3">{data.product.name}</h2>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">{formatPrice(displayPrice)}</span>
                {salePrice != null && salePrice < price && (
                  <span className="text-ink/40 line-through text-sm">
                    {formatPrice(price)}
                  </span>
                )}
              </div>
              {data.product.shortDescription && (
                <p className="text-sm text-ink/60 mb-6">
                  {data.product.shortDescription}
                </p>
              )}

              {data.variants?.length > 0 && (
                <div className="mb-6">
                  <p className="admin-label mb-2">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {data.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={
                          v.id === selectedVariantId
                            ? "border border-ink px-3 py-2 text-xs min-h-[40px]"
                            : "border border-border px-3 py-2 text-xs min-h-[40px] hover:border-ink"
                        }
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col xs:flex-row gap-3">
                <button
                  className="btn-primary w-full xs:flex-1 px-4"
                  disabled={
                    cartState === "adding" ||
                    (data.variants?.length > 0 &&
                      (!selectedVariant || selectedVariant.stock <= 0))
                  }
                  onClick={async () => {
                    setCartState("adding");
                    try {
                      await addItem(data.product, selectedVariant, 1);
                      setCartState("added");
                      setTimeout(() => setCartState("idle"), 1500);
                    } catch {
                      setCartState("idle");
                    }
                  }}
                >
                  {cartState === "adding"
                    ? "Adding..."
                    : cartState === "added"
                      ? "Added ✓"
                      : "Add to Cart"}
                </button>
                <Link
                  to={`/product/${data.product.slug}`}
                  className="btn-outline w-full xs:flex-1 px-4 text-center"
                  onClick={onClose}
                >
                  Full Details
                </Link>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
