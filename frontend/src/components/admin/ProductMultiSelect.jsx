import { useEffect, useState } from "react";
import { adminProductsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function ProductMultiSelect({ value = [], onChange }) {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    adminProductsApi
      .list(token, { status: "published", perPage: 100 })
      .then((data) => setProducts(data.products));
  }, [token]);

  function toggle(id) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  }

  return (
    <div className="border border-border max-h-48 overflow-y-auto p-2">
      {products.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm py-1">
          <input
            type="checkbox"
            checked={value.includes(p.id)}
            onChange={() => toggle(p.id)}
          />
          {p.name}
        </label>
      ))}
      {products.length === 0 && (
        <p className="text-xs text-ink/40 p-2">No published products yet.</p>
      )}
    </div>
  );
}
