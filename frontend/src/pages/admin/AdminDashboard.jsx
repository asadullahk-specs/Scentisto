import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import AdminLayout from "../../components/admin/AdminLayout";
import { adminAnalyticsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { formatCurrency } from "../../utils/currency";

const RANGE_OPTIONS = [
  { days: 7, label: "7 Days" },
  { days: 30, label: "30 Days" },
  { days: 90, label: "90 Days" },
];

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

function ChangeBadge({ change }) {
  if (change === null || change === undefined) {
    return <span className="text-[11px] text-ink/40">New</span>;
  }
  const positive = change >= 0;
  return (
    <span className={`text-[11px] ${positive ? "text-ink/60" : "text-ink/60"}`}>
      {positive ? "▲" : "▼"} {Math.abs(change)}% vs. prior period
    </span>
  );
}

function KpiCard({ label, value, change, sub }) {
  return (
    <div className="admin-card">
      <div className="text-xs uppercase tracking-luxury text-ink/50 mb-2">
        {label}
      </div>
      <div className="text-2xl font-display">{value}</div>
      <div className="mt-2 h-4">
        {sub ? (
          <span className="text-[11px] text-ink/40">{sub}</span>
        ) : (
          <ChangeBadge change={change} />
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function describeActivity(entry) {
  const who = entry.user
    ? `${entry.user.firstName} ${entry.user.lastName}`
    : "System";
  return `${who} - ${entry.action}`;
}

export default function AdminDashboard() {
  const { token, user } = useAdminAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminAnalyticsApi.getDashboard(token, days);
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl mb-1">Dashboard</h1>
          <p className="text-sm text-ink/50">
            Welcome back, {user?.firstName}. Here's how the store is doing.
          </p>
        </div>
        <div className="flex border border-border">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-4 py-2 text-xs uppercase tracking-luxury transition-colors ${
                days === opt.days
                  ? "bg-ink text-bg"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-8 p-4 border border-red-900 bg-red-950/30 text-red-200 text-sm">
          {error}
        </div>
      ) : loading || !data ? (
        <p className="text-sm text-ink/40 mt-8">Loading...</p>
      ) : (
        <div className="mt-8 space-y-8">
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Revenue"
              value={formatCurrency(data.kpis.revenue.value)}
              change={data.kpis.revenue.change}
            />
            <KpiCard
              label="Orders"
              value={data.kpis.orders.value}
              change={data.kpis.orders.change}
            />
            <KpiCard
              label="Avg. Order Value"
              value={formatCurrency(data.kpis.averageOrderValue.value)}
              change={data.kpis.averageOrderValue.change}
            />
            <KpiCard
              label="New Customers"
              value={data.kpis.newCustomers.value}
              change={data.kpis.newCustomers.change}
            />
          </div>

          {/* Revenue chart */}
          <div className="admin-card">
            <div className="text-xs uppercase tracking-luxury text-ink/50 mb-4">
              Revenue
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={data.revenueSeries}
                margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111111" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5E5E5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#11111199" }}
                  axisLine={{ stroke: "#E5E5E5" }}
                  tickLine={false}
                  tickFormatter={(d) => d.slice(5)}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#11111199" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v) =>
                    `Rs. ${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`
                  }
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    border: "1px solid #E5E5E5",
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#111111"
                  strokeWidth={1.5}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Order status breakdown */}
            <div className="admin-card">
              <div className="text-xs uppercase tracking-luxury text-ink/50 mb-4">
                Orders by Status
              </div>
              {data.statusBreakdown.length === 0 ? (
                <p className="text-sm text-ink/40">No orders in this period.</p>
              ) : (
                <div className="space-y-2">
                  {data.statusBreakdown.map((row) => {
                    const max = data.statusBreakdown[0].count || 1;
                    return (
                      <div key={row.status} className="flex items-center gap-3">
                        <div className="w-28 text-xs text-ink/60 shrink-0">
                          {STATUS_LABELS[row.status] || row.status}
                        </div>
                        <div className="flex-1 h-2 bg-surface">
                          <div
                            className="h-2 bg-ink"
                            style={{ width: `${(row.count / max) * 100}%` }}
                          />
                        </div>
                        <div className="w-6 text-right text-xs text-ink/60">
                          {row.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top products */}
            <div className="admin-card">
              <div className="text-xs uppercase tracking-luxury text-ink/50 mb-4">
                Top Products
              </div>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-ink/40">No sales in this period.</p>
              ) : (
                <ol className="space-y-3">
                  {data.topProducts.map((p, i) => (
                    <li
                      key={p.productId || i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate pr-2">
                        {i + 1}. {p.name}
                      </span>
                      <span className="text-ink/50 text-xs shrink-0">
                        {formatCurrency(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Low stock */}
            <div className="admin-card">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-luxury text-ink/50">
                  Low Stock
                </div>
                {data.kpis.lowStockCount.value > 0 && (
                  <span className="badge">{data.kpis.lowStockCount.value}</span>
                )}
              </div>
              {data.lowStockProducts.length === 0 ? (
                <p className="text-sm text-ink/40">
                  Nothing at or under its reorder level.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.lowStockProducts.map((p) => (
                    <li
                      key={`${p.productId}-${p.variantLabel}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate pr-2">
                        {p.name}{" "}
                        <span className="text-ink/40">({p.variantLabel})</span>
                      </span>
                      <span className="text-ink/60 text-xs shrink-0">
                        {p.stock} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="admin-card">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-luxury text-ink/50">
                Recent Activity
              </div>
              <Link
                to="/admin/activity-log"
                className="text-xs hover:underline"
              >
                View full log →
              </Link>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-ink/40">Nothing logged yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-ink/80">
                      {describeActivity(entry)}
                    </span>
                    <span className="text-ink/40 text-xs shrink-0">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
