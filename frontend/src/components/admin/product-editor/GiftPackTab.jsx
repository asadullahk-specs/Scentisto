import { useEffect, useState } from "react";
import { adminProductsApi } from "../../../api/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

/**
 * Gift pack items are stored at product granularity only (no
 * per-variant selection in this editor) - keeps the picker simple.
 * The full data model (models/Product.js `giftPackItems[]`) does
 * support an included variant id if a future pass wants it.
 */
export default function GiftPackTab({ productId, giftPackContents, onSaved }) {
  const { token } = useAdminAuth();
  const [allProducts, setAllProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(
      (giftPackContents || []).map((c) => ({
        includedProductId: c.productId,
        quantity: c.quantity,
        name: c.name,
      })),
    );
  }, [giftPackContents]);

  useEffect(() => {
    adminProductsApi
      .list(token, { status: "published", perPage: 100 })
      .then((data) => {
        setAllProducts(
          data.products.filter(
            (p) => p.type !== "gift_pack" && p.id !== productId,
          ),
        );
      });
  }, [token, productId]);

  function addProduct(product) {
    if (items.some((i) => i.includedProductId === product.id)) return;
    setItems((prev) => [
      ...prev,
      { includedProductId: product.id, quantity: 1, name: product.name },
    ]);
  }

  function updateQuantity(productIdToUpdate, quantity) {
    setItems((prev) =>
      prev.map((i) =>
        i.includedProductId === productIdToUpdate ? { ...i, quantity } : i,
      ),
    );
  }

  function removeItem(productIdToRemove) {
    setItems((prev) =>
      prev.filter((i) => i.includedProductId !== productIdToRemove),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await adminProductsApi.setGiftPackItems(
        token,
        productId,
        items.map((i) => ({
          includedProductId: i.includedProductId,
          quantity: Number(i.quantity) || 1,
        })),
      );
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  if (!productId) {
    return (
      <p className="text-sm text-ink/40">
        Save the product first to add gift pack contents.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm uppercase tracking-luxury text-ink/60 mb-4">
          Included Products
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-ink/40 mb-4">
            No products added to this gift pack yet.
          </p>
        ) : (
          <div className="admin-card mb-4">
            {items.map((item) => (
              <div
                key={item.includedProductId}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm">{item.name}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    className="admin-input w-20"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.includedProductId, e.target.value)
                    }
                  />
                  <button
                    className="text-xs text-ink/50 hover:underline"
                    onClick={() => removeItem(item.includedProductId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="admin-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Gift Pack Contents"}
        </button>
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-luxury text-ink/60 mb-4">
          Add a Product
        </h3>
        <div className="border border-border max-h-64 overflow-y-auto">
          {allProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0"
            >
              <span className="text-sm">{p.name}</span>
              <button
                className="text-xs hover:underline"
                onClick={() => addProduct(p)}
                disabled={items.some((i) => i.includedProductId === p.id)}
              >
                {items.some((i) => i.includedProductId === p.id)
                  ? "Added"
                  : "Add"}
              </button>
            </div>
          ))}
          {allProducts.length === 0 && (
            <p className="text-xs text-ink/40 p-3">
              No other published products yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
