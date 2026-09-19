import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { adminCategoriesApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminCategories() {
  const { token } = useAdminAuth();
  const [categories, setCategories] = useState([]);
  const [draft, setDraft] = useState({ name: "", parentId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const data = await adminCategoriesApi.list(token);
    setCategories(data.flat || []);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!draft.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await adminCategoriesApi.create(token, {
        name: draft.name.trim(),
        parentId: draft.parentId || null,
      });
      setDraft({ name: "", parentId: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisible(category) {
    await adminCategoriesApi.update(token, category.id, {
      isVisible: !category.isVisible,
    });
    load();
  }

  async function handleDelete(category) {
    if (
      !window.confirm(
        `Delete "${category.name}"? Products keep their data but lose this category.`,
      )
    )
      return;
    await adminCategoriesApi.remove(token, category.id);
    load();
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl">Categories</h1>
        <p className="text-sm text-ink/50 mt-1">
          Organize perfumes, bottles, and accessories for browsing and filters.
        </p>
      </div>

      {error && <p className="text-sm text-ink/70 mb-4">{error}</p>}

      <div className="admin-card mb-6">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="admin-label">Name</label>
            <input
              className="admin-input"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="admin-label">Parent Category</label>
            <select
              className="admin-input"
              value={draft.parentId}
              onChange={(e) =>
                setDraft((d) => ({ ...d, parentId: e.target.value }))
              }
            >
              <option value=""> - Top level - </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="admin-btn"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Category"}
          </button>
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Parent</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="text-ink/50">{c.slug}</td>
                <td className="text-ink/50">
                  {categories.find((p) => p.id === c.parentId)?.name || " - "}
                </td>
                <td>
                  <button
                    className="text-xs hover:underline"
                    onClick={() => handleToggleVisible(c)}
                  >
                    {c.isVisible ? "Visible" : "Hidden"}
                  </button>
                </td>
                <td>
                  <button
                    className="text-xs text-ink/50 hover:underline"
                    onClick={() => handleDelete(c)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/40 py-8">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
