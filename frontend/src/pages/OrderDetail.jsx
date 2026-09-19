import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { ordersApi } from "../api/ordersApi";
import { formatPrice } from "../utils/currency";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
  failed_payment: "Failed Payment",
};

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { token } = useCustomerAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ordersApi
      .get(token, id)
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-14 flex-1 w-full">
        {loading ? (
          <p className="text-sm text-ink/40">Loading...</p>
        ) : error || !order ? (
          <p className="text-sm text-ink/60">{error || "Order not found."}</p>
        ) : (
          <>
            {location.state?.justPlaced && (
              <div className="border border-border bg-surface p-5 mb-8">
                <p className="text-sm">
                  Thank you - your order has been placed.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl">{order.orderNumber}</h1>
                <p className="text-xs text-ink/40 mt-1">
                  Placed {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="badge">
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>

            <div className="divide-y divide-border border-t border-b border-border mb-8">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="w-16 h-16 bg-surface border border-border shrink-0 overflow-hidden">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/product/${item.productSlug}`}
                      className="text-sm hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {item.variantLabel && (
                      <div className="text-xs text-ink/50">
                        {item.variantLabel}
                      </div>
                    )}
                    <div className="text-xs text-ink/40">
                      Qty {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm">
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-3">
                  Shipping Address
                </h2>
                <p className="text-sm text-ink/70 leading-relaxed">
                  {order.shippingAddress.firstName}{" "}
                  {order.shippingAddress.lastName}
                  <br />
                  {order.shippingAddress.address}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                  <br />
                  {order.shippingAddress.country}
                  <br />
                  {order.shippingAddress.phone}
                </p>
              </div>
              <div>
                <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-3">
                  Order Summary
                </h2>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/50">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/50">Shipping</span>
                    <span>
                      {order.shippingCost === 0
                        ? "Free"
                        : formatPrice(order.shippingCost)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-ink/50">Discount</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                  <div className="flex justify-between text-ink/50 pt-2">
                    <span>Payment</span>
                    <span>Cash on Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
