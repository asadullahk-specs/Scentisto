import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../utils/currency";
import { imageProps } from "../utils/media";

export default function Cart() {
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14 flex-1 w-full">
        {/* flex-wrap + gap: at 320px the title and the "Continue
            Shopping" link together are wider than the content box, so
            without wrapping they overflowed the viewport. */}
        <div className="flex items-baseline justify-between flex-wrap gap-x-4 gap-y-2 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl">
            Your Cart ({items.reduce((s, i) => s + i.quantity, 0)})
          </h1>
          <Link to="/perfumes" className="text-sm text-ink/50 hover:text-ink">
            ← Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-ink/40">
            Your cart is empty.{" "}
            <Link to="/perfumes" className="underline">
              Browse perfumes →
            </Link>
          </p>
        ) : (
          <>
            <div className="divide-y divide-border border-t border-b border-border mb-8">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-5"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface border border-border shrink-0 overflow-hidden">
                      {item.imageUrl && (
                        <img
                          {...imageProps(item.imageUrl, { width: 160, maxWidth: 320 })}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.productSlug}`}
                        className="hover:underline text-sm sm:text-base clamp-2 break-words"
                      >
                        {item.productName}
                      </Link>
                      {item.variantLabel && (
                        <div className="text-xs text-ink/50">
                          {item.variantLabel}
                        </div>
                      )}
                      {item.inStock === false && (
                        <div className="text-xs text-ink/70 mt-1">
                          Out of stock - remove to continue.
                        </div>
                      )}
                      <button
                        className="text-xs text-ink/40 hover:text-ink mt-1 py-1"
                        onClick={() => removeItem(item.itemId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {/* The `pl-24` indent used to apply at every width. At
                      320px it left roughly 185px for a price, a three-part
                      stepper and a line total that together need ~220px,
                      so this row overflowed the page. The indent is gone
                      and the row is allowed to wrap. */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 flex-wrap">
                    <div className="text-sm text-ink/60 order-1">
                      {formatPrice(item.unitPrice)}
                    </div>
                    <div className="flex items-center border border-border order-2 shrink-0">
                      <button
                        aria-label="Decrease quantity"
                        className="w-10 h-10 flex items-center justify-center text-sm hover:bg-surface"
                        onClick={() =>
                          updateQuantity(item.itemId, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span className="px-3 text-sm tabular-nums min-w-[2ch] text-center">
                        {item.quantity}
                      </span>
                      <button
                        aria-label="Increase quantity"
                        className="w-10 h-10 flex items-center justify-center text-sm hover:bg-surface"
                        onClick={() =>
                          updateQuantity(item.itemId, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm order-3 sm:w-20 text-right shrink-0">
                      {formatPrice(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:max-w-xs">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-ink/50">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <p className="text-xs text-ink/40 mb-4">
                  Shipping and any tax are calculated at checkout.
                </p>
                <button
                  className="btn-primary w-full"
                  disabled={loading || items.some((i) => i.inStock === false)}
                  onClick={() => navigate("/checkout")}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
