import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { adminOrdersApi } from "../../api/ordersApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { formatPrice } from "../../utils/currency";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "failed_payment",
];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAdminAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    status: "",
    trackingNumber: "",
    courierCompany: "",
    internalNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminOrdersApi.get(token, id);
      setOrder(data.order);
      setForm({
        status: data.order.status,
        trackingNumber: data.order.trackingNumber || "",
        courierCompany: data.order.courierCompany || "",
        internalNotes: data.order.internalNotes || "",
      });
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await adminOrdersApi.updateStatus(token, id, form);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !order) {
    return (
      <AdminLayout>
        <p className="text-sm text-ink/40">Loading...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl">{order.orderNumber}</h1>
          <p className="text-sm text-ink/50 mt-1">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          className="admin-btn-outline"
          onClick={() => navigate("/admin/orders")}
        >
          Back to Orders
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="admin-card">
            <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-4">
              Items ({order.items.length})
            </h2>
            <div className="divide-y divide-border">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="w-14 h-14 bg-surface border border-border shrink-0 overflow-hidden">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-sm">
                    {item.productName}{" "}
                    {item.variantLabel && ` - ${item.variantLabel}`}
                    <div className="text-xs text-ink/40">
                      SKU {item.sku} · Qty {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm">
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-4">
              Shipping Address
            </h2>
            <p className="text-sm text-ink/70 leading-relaxed">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.address}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state},{" "}
              {order.shippingAddress.country}
              <br />
              {order.shippingAddress.phone} · {order.shippingAddress.email}
            </p>
            {order.shippingAddress.notes && (
              <p className="text-xs text-ink/50 mt-3">
                Note: {order.shippingAddress.notes}
              </p>
            )}
          </div>

          <div className="admin-card">
            <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-4">
              Order Timeline
            </h2>
            <ul className="space-y-2 text-sm">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="flex justify-between text-ink/60">
                  <span className="capitalize">
                    {h.status.replace(/_/g, " ")}
                  </span>
                  <span>{new Date(h.changedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="admin-card">
            <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-4">
              Order Summary
            </h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/50">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/50">Shipping</span>
                <span>{formatPrice(order.shippingCost)}</span>
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
                <span className="capitalize">
                  {order.paymentMethod} · {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="text-sm uppercase tracking-luxury text-ink/50 mb-4">
              Update Status
            </h2>
            <label className="admin-label">Status</label>
            <select
              className="admin-input mb-4"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <label className="admin-label">Tracking Number</label>
            <input
              className="admin-input mb-4"
              value={form.trackingNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, trackingNumber: e.target.value }))
              }
            />

            <label className="admin-label">Courier Company</label>
            <input
              className="admin-input mb-4"
              value={form.courierCompany}
              onChange={(e) =>
                setForm((f) => ({ ...f, courierCompany: e.target.value }))
              }
            />

            <label className="admin-label">Internal Notes</label>
            <textarea
              className="admin-input mb-4"
              value={form.internalNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, internalNotes: e.target.value }))
              }
            />

            {error && <p className="text-xs text-ink/70 mb-3">{error}</p>}
            <button
              className="admin-btn w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
