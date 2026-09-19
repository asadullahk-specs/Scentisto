import { useState } from "react";
import { adminProductsApi } from "../../../api/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

const BLANK = {
  label: "",
  sizeMl: "",
  price: "",
  salePrice: "",
  sku: "",
  stock: 0,
  isDefault: false,
};

export default function VariantsTab({ productId, variants, reload }) {
  const { token } = useAdminAuth();
  const [draft, setDraft] = useState(BLANK);
  const [rows, setRows] = useState({}); // id -> edited field overrides
  const [saving, setSaving] = useState(false);

  function rowValue(variant, key) {
    return rows[variant.id]?.[key] ?? variant[key];
  }
  function setRowValue(variantId, key, value) {
    setRows((r) => ({ ...r, [variantId]: { ...r[variantId], [key]: value } }));
  }

  async function handleAdd() {
    if (!draft.label || !draft.price || !draft.sku) return;
    setSaving(true);
    try {
      await adminProductsApi.createVariant(token, productId, {
        ...draft,
        sizeMl: draft.sizeMl ? Number(draft.sizeMl) : undefined,
        price: Number(draft.price),
        salePrice: draft.salePrice ? Number(draft.salePrice) : undefined,
        stock: Number(draft.stock) || 0,
      });
      setDraft(BLANK);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRow(variant) {
    const edits = rows[variant.id];
    if (!edits) return;
    await adminProductsApi.updateVariant(token, productId, variant.id, {
      label: edits.label ?? variant.label,
      price: edits.price !== undefined ? Number(edits.price) : undefined,
      salePrice:
        edits.salePrice !== undefined ? Number(edits.salePrice) : undefined,
      stock: edits.stock !== undefined ? Number(edits.stock) : undefined,
      isVisible: edits.isVisible !== undefined ? edits.isVisible : undefined,
      isDefault: edits.isDefault !== undefined ? edits.isDefault : undefined,
    });
    setRows((r) => ({ ...r, [variant.id]: undefined }));
    reload();
  }

  async function handleRemove(variant) {
    if (!window.confirm(`Remove the ${variant.label} variant?`)) return;
    await adminProductsApi.removeVariant(token, productId, variant.id);
    reload();
  }

  if (!productId) {
    return (
      <p className="text-sm text-ink/40">
        Save the product first to add ML variants.
      </p>
    );
  }

  return (
    <div>
      <div className="admin-card overflow-x-auto mb-6">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Price (Rs.)</th>
              <th>Sale Price (Rs.)</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Default</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id}>
                <td>
                  <input
                    className="admin-input"
                    value={rowValue(v, "label")}
                    onChange={(e) => setRowValue(v.id, "label", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="1"
                    className="admin-input w-24"
                    value={rowValue(v, "price")}
                    onChange={(e) => setRowValue(v.id, "price", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="1"
                    className="admin-input w-24"
                    value={rowValue(v, "salePrice") ?? ""}
                    onChange={(e) =>
                      setRowValue(v.id, "salePrice", e.target.value)
                    }
                  />
                </td>
                <td className="text-ink/50">{v.sku}</td>
                <td>
                  <input
                    type="number"
                    className="admin-input w-20"
                    value={rowValue(v, "stock")}
                    onChange={(e) => setRowValue(v.id, "stock", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    name="defaultVariant"
                    checked={rowValue(v, "isDefault") ?? Boolean(v.isDefault)}
                    onChange={() => setRowValue(v.id, "isDefault", true)}
                  />
                </td>
                <td>
                  <div className="flex gap-3 text-xs">
                    <button
                      className="hover:underline"
                      onClick={() => handleSaveRow(v)}
                    >
                      Save
                    </button>
                    <button
                      className="hover:underline text-ink/50"
                      onClick={() => handleRemove(v)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink/40 py-6">
                  No ML variants yet - add 30ml, 50ml, 100ml, or any custom size
                  below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-card">
        <h3 className="text-sm uppercase tracking-luxury text-ink/60 mb-4">
          Add Variant
        </h3>
        <div className="grid grid-cols-6 gap-3 items-end">
          <div>
            <label className="admin-label">Label</label>
            <input
              className="admin-input"
              placeholder="50ml"
              value={draft.label}
              onChange={(e) =>
                setDraft((d) => ({ ...d, label: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="admin-label">Size (ml)</label>
            <input
              type="number"
              className="admin-input"
              value={draft.sizeMl}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sizeMl: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="admin-label">Price (Rs.)</label>
            <input
              type="number"
              step="1"
              placeholder="e.g. 2500"
              className="admin-input"
              value={draft.price}
              onChange={(e) =>
                setDraft((d) => ({ ...d, price: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="admin-label">Sale Price (Rs.)</label>
            <input
              type="number"
              step="1"
              placeholder="e.g. 1999"
              className="admin-input"
              value={draft.salePrice}
              onChange={(e) =>
                setDraft((d) => ({ ...d, salePrice: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="admin-label">SKU</label>
            <input
              className="admin-input"
              value={draft.sku}
              onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            />
          </div>
          <div>
            <label className="admin-label">Stock</label>
            <input
              type="number"
              className="admin-input"
              value={draft.stock}
              onChange={(e) =>
                setDraft((d) => ({ ...d, stock: e.target.value }))
              }
            />
          </div>
        </div>
        <button
          className="admin-btn mt-4"
          onClick={handleAdd}
          disabled={saving}
        >
          {saving ? "Adding..." : "Add Variant"}
        </button>
      </div>
    </div>
  );
}
