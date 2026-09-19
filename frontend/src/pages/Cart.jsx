import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../utils/currency";

export default function Cart() {
  const { items, subtotal, loading, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-14 flex-1 w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl">
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
                  className="flex flex-col sm:flex-row sm:items-center gap-4 py-5"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-20 h-20 bg-surface border border-border shrink-0 overflow-hidden">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.productSlug}`}
                        className="hover:underline"
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
                        className="text-xs text-ink/40 hover:text-ink mt-1"
                        onClick={() => removeItem(item.itemId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end sm:gap-6 pl-24 sm:pl-0">
                    <div className="text-sm">{formatPrice(item.unitPrice)}</div>
                    <div className="flex items-center border border-border">
                      <button
                        className="px-3 py-1 text-sm hover:bg-surface"
                        onClick={() =>
                          updateQuantity(item.itemId, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span className="px-3 text-sm">{item.quantity}</span>
                      <button
                        className="px-3 py-1 text-sm hover:bg-surface"
                        onClick={() =>
                          updateQuantity(item.itemId, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm w-16 sm:w-20 text-right">
                      {formatPrice(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs">
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
