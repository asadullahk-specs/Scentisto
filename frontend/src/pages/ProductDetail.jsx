import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import ProductCard from "../components/public/ProductCard";
import ReviewsSection from "../components/public/ReviewsSection";
import GiftPackContents from "../components/public/GiftPackContents";
import { publicProductsApi } from "../api/publicApi";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../utils/currency";

const HEARTBEAT_INTERVAL_MS = 20000;

function RulerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <path d="M7 8v3M11 8v3M15 8v3" />
    </svg>
  );
}
function DropletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3s6 6.5 6 10.5a6 6 0 01-12 0C6 9.5 12 3 12 3z" />
    </svg>
  );
}
function WindIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h11a2.5 2.5 0 100-5" />
      <path d="M3 16h14a2.5 2.5 0 110 5" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7h11v9H3z" />
      <path d="M14 11h4l3 3v2h-7z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12a9 9 0 109-9" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [cartState, setCartState] = useState("idle"); // idle | adding | added
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [viewersNow, setViewersNow] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const sessionIdRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCartState("idle");
    publicProductsApi
      .getBySlug(slug)
      .then((res) => {
        setData(res);
        setViewersNow(res.viewersNow || 0);
        const defaultVariant =
          res.variants?.find((v) => v.isDefault) || res.variants?.[0];
        setSelectedVariantId(defaultVariant?.id || null);
        setActiveMediaIndex(0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // "N people are viewing this right now" - a real (not simulated)
  // count of other visitors currently on this same product page,
  // kept alive with a heartbeat while this visitor stays here too.
  // sessionIdRef never persists anywhere; it just tells the backend
  // "this is still the same visitor" across heartbeats.
  useEffect(() => {
    if (!slug) return undefined;
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    let cancelled = false;

    function sendHeartbeat() {
      publicProductsApi
        .sendPresenceHeartbeat(slug, sessionIdRef.current)
        .then((res) => {
          if (!cancelled && typeof res.viewers === "number")
            setViewersNow(res.viewers);
        })
        .catch(() => {}); // best-effort - a missed heartbeat just means a stale count, never a broken page
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [slug]);

  // Sticky bottom Add to Cart / Buy Now bar - appears once the
  // shopper has scrolled past the main CTA buttons in the info
  // column (mirrors the reference video's persistent action bar),
  // and hides again once they scroll back up to it.
  useEffect(() => {
    if (!ctaRef.current || loading) return undefined;
    const el = ctaRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "-88px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, data]);

  const selectedVariant = useMemo(
    () => data?.variants?.find((v) => v.id === selectedVariantId) || null,
    [data, selectedVariantId],
  );

  const galleryItems = useMemo(() => {
    if (!data) return [];
    const primary = data.product.primaryMediaUrl
      ? [
          {
            mediaType: data.product.primaryMediaType,
            url: data.product.primaryMediaUrl,
          },
        ]
      : [];
    return [...primary, ...(data.media || [])];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <p className="max-w-6xl mx-auto px-6 py-24 text-sm text-ink/40">
          Loading...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <p className="text-sm text-ink/60 mb-4">
            {error || "Product not found."}
          </p>
          <Link to="/" className="btn-outline inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { product, details, related } = data;
  const price = selectedVariant ? selectedVariant.price : product.price;
  const salePrice = selectedVariant
    ? selectedVariant.salePrice
    : product.salePrice;
  const displayPrice = salePrice ?? price;
  const activeMedia = galleryItems[activeMediaIndex];
  const outOfStock =
    data.variants?.length > 0 && (!selectedVariant || selectedVariant.stock <= 0);

  const quickFacts = [
    selectedVariant?.label && {
      icon: <RulerIcon />,
      label: "Size",
      value: selectedVariant.label,
    },
    details?.longevity && {
      icon: <DropletIcon />,
      label: "Longevity",
      value: details.longevity,
    },
    details?.sillage && {
      icon: <WindIcon />,
      label: "Sillage",
      value: details.sillage,
    },
    {
      icon: <TruckIcon />,
      label: "Delivery",
      value: details?.shippingInfo ? "See shipping info" : "2-4 working days",
    },
    {
      icon: <ReturnIcon />,
      label: "Returns",
      value: details?.returnsInfo ? "See returns policy" : "7 days, unopened",
    },
  ].filter(Boolean);

  async function handleAddToCart() {
    setCartState("adding");
    try {
      await addItem(product, selectedVariant, 1);
      setCartState("added");
      setTimeout(() => setCartState("idle"), 1800);
    } catch {
      setCartState("idle");
    }
  }

  async function handleBuyNow() {
    setBuyNowLoading(true);
    try {
      await addItem(product, selectedVariant, 1);
      navigate("/cart");
    } catch {
      setBuyNowLoading(false);
    }
  }

  return (
    <div className={`min-h-screen bg-bg ${showStickyBar ? "pb-20" : ""}`}>
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-xs text-ink/40 mb-8">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>{" "}
          / {product.name}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Gallery - pinned in place while the info column (right)
              scrolls through its content, matching the reference video. */}
          <div className="md:sticky md:top-24 md:self-start overflow-hidden">
            <div className="flex gap-3">
              {/* Vertical thumbnail rail - sm and up */}
              {galleryItems.length > 1 && (
                <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0 max-h-[540px] overflow-y-auto overflow-x-hidden pr-0.5">
                  {galleryItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveMediaIndex(index)}
                      className={`w-16 h-16 shrink-0 border overflow-hidden ${
                        index === activeMediaIndex
                          ? "border-ink"
                          : "border-border hover:border-ink/40"
                      }`}
                    >
                      {item.mediaType === "video" ? (
                        <div className="w-full h-full bg-surface flex items-center justify-center text-[10px] text-ink/50">
                          Video
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 min-w-0 aspect-square bg-surface border border-border overflow-hidden">
                {activeMedia?.mediaType === "video" ? (
                  <iframe
                    src={activeMedia.url}
                    title={product.name}
                    className="w-full h-full"
                    allow="autoplay"
                  />
                ) : (
                  <img
                    src={activeMedia?.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  />
                )}
              </div>
            </div>

            {/* Horizontal thumbnails below the image - mobile only */}
            {galleryItems.length > 1 && (
              <div className="sm:hidden flex gap-2 mt-3 overflow-x-auto">
                {galleryItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveMediaIndex(index)}
                    className={`w-16 h-16 shrink-0 border overflow-hidden ${
                      index === activeMediaIndex
                        ? "border-ink"
                        : "border-border"
                    }`}
                  >
                    {item.mediaType === "video" ? (
                      <div className="w-full h-full bg-surface flex items-center justify-center text-[10px] text-ink/50">
                        Video
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-xs uppercase tracking-luxury text-ink/50 mb-2">
              {product.brand}
            </p>
            <h1 className="text-3xl mb-3">{product.name}</h1>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">{formatPrice(displayPrice)}</span>
              {salePrice != null && salePrice < price && (
                <span className="text-ink/40 line-through">
                  {formatPrice(price)}
                </span>
              )}
            </div>

            {(viewersNow > 0 || data.purchasesLast24h > 0) && (
              <div className="flex flex-col gap-2 mb-6">
                {viewersNow > 0 && (
                  <div className="flex items-center gap-2 text-xs uppercase tracking-luxury bg-[#EAF4EE] text-[#2F6B45] px-3 py-2 w-fit">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {viewersNow} {viewersNow === 1 ? "person is" : "people are"}{" "}
                    viewing this right now
                  </div>
                )}
                {data.purchasesLast24h > 0 && (
                  <div className="flex items-center gap-2 text-xs uppercase tracking-luxury bg-[#FBEFE0] text-[#96591A] px-3 py-2 w-fit">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 2l1.5 4h9L18 2" />
                      <path d="M3.5 6h17l-1.5 13a2 2 0 01-2 2H7a2 2 0 01-2-2L3.5 6z" />
                    </svg>
                    {data.purchasesLast24h} bought in the last 24 hours
                  </div>
                )}
              </div>
            )}

            {product.shortDescription && (
              <p className="text-ink/60 mb-6">{product.shortDescription}</p>
            )}

            {product.type === "gift_pack" && (
              <GiftPackContents items={data.giftPackContents} />
            )}

            {data.variants && data.variants.length > 0 && (
              <div className="mb-6">
                <p className="admin-label mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {data.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={
                        v.id === selectedVariantId
                          ? "border border-ink px-4 py-2 text-sm"
                          : "border border-border px-4 py-2 text-sm hover:border-ink"
                      }
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <p className="text-xs text-ink/40 mt-2">
                    {selectedVariant.stock > 0
                      ? `${selectedVariant.stock} in stock`
                      : "Out of stock"}
                  </p>
                )}
              </div>
            )}

            {/* Primary CTAs - the sticky bottom bar mirrors these once
                this block scrolls out of view. */}
            <div ref={ctaRef} className="flex flex-col xs:flex-row gap-3 mb-2">
              <button
                className="btn-primary w-full xs:flex-1"
                disabled={cartState === "adding" || outOfStock}
                onClick={handleAddToCart}
              >
                {cartState === "adding"
                  ? "Adding..."
                  : cartState === "added"
                    ? "Added ✓"
                    : "Add to Cart"}
              </button>
              <button
                className="btn-outline w-full xs:flex-1"
                disabled={buyNowLoading || outOfStock}
                onClick={handleBuyNow}
              >
                {buyNowLoading ? "Please wait..." : "Buy Now"}
              </button>
            </div>
            <p className="text-xs text-ink/40 mb-8">
              Free returns within 7 days on unopened bottles.
            </p>

            {/* Quick facts row */}
            {quickFacts.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 border-t border-border pt-6 mb-6">
                {quickFacts.map((fact) => (
                  <div key={fact.label} className="flex flex-col items-center text-center gap-1.5">
                    <span className="text-ink/60">{fact.icon}</span>
                    <span className="text-[10px] uppercase tracking-luxury text-ink/40">
                      {fact.label}
                    </span>
                    <span className="text-xs text-ink/70">{fact.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* All product information is stacked and always visible -
                the shopper scrolls through Description, Fragrance Notes,
                Details, and Shipping & Returns in sequence instead of
                clicking between tabs. */}
            <div className="border-t border-border pt-6 space-y-8">
              <section>
                <h3 className="text-xs uppercase tracking-luxury text-ink/40 mb-3">
                  Description
                </h3>
                <p className="text-sm text-ink/70 leading-relaxed">
                  {product.description ||
                    product.shortDescription ||
                    "No description yet."}
                </p>
              </section>

              <section className="border-t border-border pt-8">
                <h3 className="text-xs uppercase tracking-luxury text-ink/40 mb-3">
                  Fragrance Notes
                </h3>
                <div className="text-sm text-ink/70 space-y-2">
                  {details?.topNotes?.length > 0 && (
                    <p>
                      <strong>Top:</strong> {details.topNotes.join(", ")}
                    </p>
                  )}
                  {details?.middleNotes?.length > 0 && (
                    <p>
                      <strong>Middle:</strong> {details.middleNotes.join(", ")}
                    </p>
                  )}
                  {details?.baseNotes?.length > 0 && (
                    <p>
                      <strong>Base:</strong> {details.baseNotes.join(", ")}
                    </p>
                  )}
                  {!details?.topNotes?.length &&
                    !details?.middleNotes?.length &&
                    !details?.baseNotes?.length && (
                      <p className="text-ink/40">
                        No fragrance notes listed yet.
                      </p>
                    )}
                </div>
              </section>

              <section className="border-t border-border pt-8">
                <h3 className="text-xs uppercase tracking-luxury text-ink/40 mb-3">
                  Details
                </h3>
                <div className="text-sm text-ink/70 space-y-2">
                  {details?.longevity && (
                    <p>
                      <strong>Longevity:</strong> {details.longevity}
                    </p>
                  )}
                  {details?.projection && (
                    <p>
                      <strong>Projection:</strong> {details.projection}
                    </p>
                  )}
                  {details?.sillage && (
                    <p>
                      <strong>Sillage:</strong> {details.sillage}
                    </p>
                  )}
                  {details?.season && (
                    <p>
                      <strong>Season:</strong> {details.season}
                    </p>
                  )}
                  {details?.occasion && (
                    <p>
                      <strong>Occasion:</strong> {details.occasion}
                    </p>
                  )}
                  {details?.ingredients && (
                    <p>
                      <strong>Ingredients:</strong> {details.ingredients}
                    </p>
                  )}
                  {!details && (
                    <p className="text-ink/40">No additional details yet.</p>
                  )}
                </div>
              </section>

              <section className="border-t border-border pt-8">
                <h3 className="text-xs uppercase tracking-luxury text-ink/40 mb-3">
                  Shipping & Returns
                </h3>
                <div className="text-sm text-ink/70 space-y-2">
                  <p>
                    {details?.shippingInfo ||
                      "Standard shipping information not yet added."}
                  </p>
                  <p>
                    {details?.returnsInfo ||
                      "Standard return policy not yet added."}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>

        {related?.recommended?.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl mb-6">Complete the Look</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.recommended.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <ReviewsSection productId={product.id} productSlug={product.slug} />
      </div>

      {/* Sticky bottom action bar - stays fixed to the viewport once
          the shopper scrolls past the main Add to Cart / Buy Now
          buttons above, so checkout is always one tap away. */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-40 bg-bg border-t border-border shadow-soft transition-transform duration-300 ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 bg-surface border border-border overflow-hidden">
              {activeMedia?.mediaType !== "video" && activeMedia?.url && (
                <img
                  src={activeMedia.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate">{product.name}</p>
              <p className="text-xs text-ink/50">{formatPrice(displayPrice)}</p>
            </div>
          </div>
          <div className="flex gap-3 flex-1 sm:flex-none">
            <button
              className="btn-primary flex-1 sm:flex-none sm:w-40"
              disabled={cartState === "adding" || outOfStock}
              onClick={handleAddToCart}
            >
              {cartState === "adding"
                ? "Adding..."
                : cartState === "added"
                  ? "Added ✓"
                  : "Add to Cart"}
            </button>
            <button
              className="btn-outline flex-1 sm:flex-none sm:w-32"
              disabled={buyNowLoading || outOfStock}
              onClick={handleBuyNow}
            >
              {buyNowLoading ? "Wait..." : "Buy Now"}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
