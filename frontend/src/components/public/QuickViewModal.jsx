import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicProductsApi } from "../../api/publicApi";
import { useCart } from "../../context/CartContext";
import { formatPrice } from "../../utils/currency";

export default function QuickViewModal({ slug, onClose }) {
  const { addItem } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [cartState, setCartState] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    publicProductsApi.getBySlug(slug).then((res) => {
      if (cancelled) return;
      setData(res);
      const defaultVariant =
        res.variants?.find((v) => v.isDefault) || res.variants?.[0];
      setSelectedVariantId(defaultVariant?.id || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-bg max-w-2xl w-full max-h-[85vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-bg border border-border hover:bg-surface"
          aria-label="Close quick view"
        >
          ✕
        </button>

        {loading || !data ? (
          <p className="text-sm text-ink/40 p-16 text-center">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="aspect-square bg-surface overflow-hidden">
              {data.product.primaryMediaUrl && (
                <img
                  src={data.product.primaryMediaUrl}
                  alt={data.product.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-8">
              <p className="text-xs uppercase tracking-luxury text-ink/50 mb-2">
                {data.product.brand}
              </p>
              <h2 className="text-2xl mb-3">{data.product.name}</h2>
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
                            ? "border border-ink px-3 py-1.5 text-xs"
                            : "border border-border px-3 py-1.5 text-xs hover:border-ink"
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
  );
}
