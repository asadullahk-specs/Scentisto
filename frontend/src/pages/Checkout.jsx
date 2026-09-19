import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useCart } from "../context/CartContext";
import { ordersApi } from "../api/ordersApi";
import { formatPrice } from "../utils/currency";

const BLANK_ADDRESS = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  country: "",
  city: "",
  state: "",
  address: "",
  notes: "",
};

/**
 * Reachable only via <ProtectedRoute> in App.jsx - a guest hitting
 * /checkout is redirected to /login before this component ever
 * renders. The server independently enforces the same rule on
 * POST /api/orders (requireAuth + requireScope("storefront")), so
 * this page is a UX convenience, not the real security boundary.
 */
export default function Checkout() {
  const { user, token } = useCustomerAuth();
  const { items, subtotal, refresh } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    ...BLANK_ADDRESS,
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) =>
    setAddress((a) => ({ ...a, [key]: e.target.value }));

  // NOTE - known coupling, flagged rather than papered over: these
  // two numbers duplicate the backend's FREE_SHIPPING_THRESHOLD and
  // FLAT_SHIPPING_COST environment variables. The server recomputes
  // the authoritative total when the order is created, so a mismatch
  // here does not produce a wrong charge - but it would show the
  // customer a total that differs from their confirmation. The
  // summary below is therefore labelled as an estimate. The real fix
  // is for the API to publish these values; that needs a new public
  // endpoint and is listed in the report as outstanding.
  const FREE_SHIPPING_THRESHOLD = 100;
  const FLAT_SHIPPING_COST = 10;
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
  const estimatedTotal = Math.max(
    0,
    Math.round((subtotal + shippingCost) * 100) / 100,
  );

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError(null);
    try {
      const { order } = await ordersApi.create(token, address);
      await refresh();
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Header />
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-24 text-center flex-1">
          <p className="text-sm text-ink/60 mb-4">Your cart is empty.</p>
          <Link to="/perfumes" className="btn-primary inline-block">
            Continue Shopping
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      {/* The summary is ordered FIRST on mobile so the shopper can see
          what they are paying before filling in eight fields, and
          sticks alongside the form from md: up. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 grid md:grid-cols-3 gap-8 md:gap-12">
        <form onSubmit={handlePlaceOrder} className="md:col-span-2 space-y-8 order-2 md:order-1 min-w-0">
          <div>
            <h2 className="text-xl mb-4">Shipping Address</h2>
            {/* Below 640px this is a plain flex column, so every field
                is guaranteed to be its own row - no dependency on a
                grid column collapsing to 1. At sm (640px) and up it
                switches to the two-column grid layout. */}
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
              <div>
                <label className="label-luxury">First Name *</label>
                <input
                  className="input-luxury"
                  required
                  value={address.firstName}
                  onChange={set("firstName")}
                />
              </div>
              <div>
                <label className="label-luxury">Last Name *</label>
                <input
                  className="input-luxury"
                  required
                  value={address.lastName}
                  onChange={set("lastName")}
                />
              </div>
              <div>
                <label className="label-luxury">Email Address *</label>
                <input
                  type="email"
                  className="input-luxury"
                  required
                  value={address.email}
                  onChange={set("email")}
                />
              </div>
              <div>
                <label className="label-luxury">Phone Number *</label>
                <input
                  className="input-luxury"
                  required
                  value={address.phone}
                  onChange={set("phone")}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-luxury">Complete Address *</label>
                <input
                  className="input-luxury"
                  required
                  placeholder="Street, building, unit - no separate apartment field needed"
                  value={address.address}
                  onChange={set("address")}
                />
              </div>
              <div>
                <label className="label-luxury">City *</label>
                <input
                  className="input-luxury"
                  required
                  value={address.city}
                  onChange={set("city")}
                />
              </div>
              <div>
                <label className="label-luxury">State / Province *</label>
                <input
                  className="input-luxury"
                  required
                  value={address.state}
                  onChange={set("state")}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-luxury">Country *</label>
                <input
                  className="input-luxury"
                  required
                  value={address.country}
                  onChange={set("country")}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-luxury">Order Notes (optional)</label>
                <textarea
                  className="input-luxury h-24 resize-none"
                  value={address.notes}
                  onChange={set("notes")}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl mb-4">Payment Method</h2>
            <div className="border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cash on Delivery (COD)</span>
                <span className="badge">Available</span>
              </div>
              <p className="text-xs text-ink/50 mt-2">
                Pay with cash when your order is delivered. Please keep the
                exact amount ready.
              </p>
            </div>
            <p className="text-xs text-ink/40 mt-2">
              Card and digital wallet payments are configured in a later phase.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={placing}
          >
            {placing ? "Placing Order..." : "Place Order"}
          </button>
        </form>

        <div className="order-1 md:order-2 min-w-0">
          <h2 className="text-xl mb-4">Order Summary</h2>
          <div className="border border-border p-4 sm:p-5 space-y-3 md:sticky md:top-24">
            {/* min-w-0 + break-words on the name cell: a long product
                name previously pushed the price out of the card. */}
            {items.map((item) => (
              <div key={item.itemId} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">
                  {item.productName}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""} ×{" "}
                  {item.quantity}
                </span>
                <span className="shrink-0 tabular-nums">{formatPrice(item.lineTotal)}</span>
              </div>
            ))}

            <div className="border-t border-border pt-3 flex justify-between text-sm">
              <span className="text-ink/50">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink/50">Shipping</span>
              <span>
                {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between gap-3 text-base">
              <span>Estimated Total</span>
              <span className="shrink-0 tabular-nums">{formatPrice(estimatedTotal)}</span>
            </div>
            <p className="text-xs text-ink/40">
              Final shipping and total are confirmed by the server when
              your order is placed.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
