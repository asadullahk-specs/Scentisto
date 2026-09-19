import { useEffect, useState } from "react";
import { adminCollectionsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function CollectionMultiSelect({ value = [], onChange }) {
  const { token } = useAdminAuth();
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    adminCollectionsApi
      .list(token)
      .then((data) => setCollections(data.collections));
  }, [token]);

  function toggle(id) {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  }

  return (
    <div className="border border-border max-h-48 overflow-y-auto p-2">
      {collections.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm py-1">
          <input
            type="checkbox"
            checked={value.includes(c.id)}
            onChange={() => toggle(c.id)}
          />
          {c.name}
        </label>
      ))}
      {collections.length === 0 && (
        <p className="text-xs text-ink/40 p-2">No collections yet.</p>
      )}
    </div>
  );
}
