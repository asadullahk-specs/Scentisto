import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Pagination from "../../components/admin/Pagination";
import { adminOrdersApi } from "../../api/ordersApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { formatPrice } from "../../utils/currency";

const STATUS_TABS = [
  ["", "All"],
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
  ["refunded", "Refunded"],
];

export default function AdminOrders() {
  const { token } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminOrdersApi.list(token, {
        status,
        search,
        page,
        perPage: 15,
      });
      setOrders(data.orders);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [token, status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <h1 className="text-2xl mb-1">Orders</h1>
      <p className="text-sm text-ink/50 mb-6">
        Manage and fulfill customer orders.
      </p>

      <div className="flex items-center gap-2 mb-4 border-b border-border">
        {STATUS_TABS.map(([value, label]) => (
          <button
            key={value}
            className={status === value ? "tab-btn-active" : "tab-btn"}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        className="admin-input max-w-xs mb-6"
        placeholder="Search order #, name, email..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center text-ink/40 py-10">
                  Loading orders...
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink/40 py-10">
                  No orders found.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>
                  {order.shippingAddress.firstName}{" "}
                  {order.shippingAddress.lastName}
                  <div className="text-xs text-ink/40">
                    {order.shippingAddress.email}
                  </div>
                </td>
                <td className="text-ink/60">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td>{formatPrice(order.total)}</td>
                <td className="text-ink/60 capitalize">
                  {order.paymentMethod} · {order.paymentStatus}
                </td>
                <td>
                  <span className="badge capitalize">
                    {order.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="text-xs hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination meta={meta} onPageChange={setPage} />
    </AdminLayout>
  );
}
