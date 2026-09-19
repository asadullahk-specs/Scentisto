import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import Pagination from "../../components/admin/Pagination";
import { adminProductsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { formatPrice } from "../../utils/currency";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "unpublished", label: "Unpublished" },
  { value: "archived", label: "Archived" },
];

export default function AdminProducts() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminProductsApi.list(token, {
        status,
        search,
        type,
        page,
        perPage: 12,
      });
      setProducts(data.products);
      setMeta(data.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, status, search, type, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(product, newStatus) {
    await adminProductsApi.setStatus(token, product.id, newStatus);
    load();
  }

  async function handleDuplicate(product) {
    await adminProductsApi.duplicate(token, product.id);
    load();
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`))
      return;
    await adminProductsApi.remove(token, product.id);
    load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl">Products</h1>
          <p className="text-sm text-ink/50 mt-1">
            Perfumes, bottles, gift packs, and accessories - one system.
          </p>
        </div>
        <button
          className="admin-btn"
          onClick={() => navigate("/admin/products/new")}
        >
          + Add Product
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            className={status === tab.value ? "tab-btn-active" : "tab-btn"}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <input
          className="admin-input max-w-xs"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="admin-input w-44"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="perfume">Perfume</option>
          <option value="bottle">Bottle</option>
          <option value="gift_pack">Gift Pack</option>
          <option value="accessory">Accessory</option>
        </select>
      </div>

      {error && <p className="text-sm text-ink/70 mb-4">{error}</p>}

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center text-ink/40 py-10">
                  Loading products...
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink/40 py-10">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-surface border border-border shrink-0 overflow-hidden">
                      {p.primaryMediaUrl && p.primaryMediaType !== "video" && (
                        <img
                          src={p.primaryMediaUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      )}
                    </div>
                    <div>
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-ink/40 capitalize">
                        {p.type.replace("_", " ")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-ink/60">{p.categoryName || " - "}</td>
                <td className="text-ink/60">{p.sku}</td>
                <td>
                  {p.effectivePrice != null
                    ? formatPrice(p.effectivePrice)
                    : " - "}
                </td>
                <td className="text-ink/60">
                  {p.hasVariants ? (p.variantStockTotal ?? 0) : " - "}
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td>
                  <div className="flex items-center gap-3 text-xs">
                    <Link
                      to={`/admin/products/${p.id}/edit`}
                      className="hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      className="hover:underline"
                      onClick={() => handleDuplicate(p)}
                    >
                      Duplicate
                    </button>
                    {p.status === "published" ? (
                      <button
                        className="hover:underline"
                        onClick={() => handleStatusChange(p, "unpublished")}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        className="hover:underline"
                        onClick={() => handleStatusChange(p, "published")}
                      >
                        Publish
                      </button>
                    )}
                    <button
                      className="hover:underline text-ink/50"
                      onClick={() => handleDelete(p)}
                    >
                      Delete
                    </button>
                  </div>
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
