import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function OrderHistory() {
  const { token } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi
      .list(token)
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-14 flex-1 w-full">
        <h1 className="text-3xl mb-8">Your Orders</h1>

        {loading ? (
          <p className="text-sm text-ink/40">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-ink/40">
            No orders yet.{" "}
            <Link to="/perfumes" className="underline">
              Start shopping →
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between py-5 hover:bg-surface transition-colors px-2"
              >
                <div>
                  <div className="text-sm">{order.orderNumber}</div>
                  <div className="text-xs text-ink/40">
                    {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                    {order.items.length} item
                    {order.items.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {formatPrice(order.total)}
                  </div>
                  <div className="text-xs text-ink/50">
                    {STATUS_LABELS[order.status] || order.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
