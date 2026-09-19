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

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCategoriesApi.list(token);
      setCategories(data.flat || []);
      setError(null);
    } catch (err) {
      // Previously uncaught: a failed load left an empty table that
      // was indistinguishable from "no categories exist yet".
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  /** Shared wrapper so no row action can fail silently. */
  async function runAction(label, action) {
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(label);
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

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
      await load();
      setNotice("Category added.");
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleToggleVisible(category) {
    return runAction(
      `"${category.name}" is now ${category.isVisible ? "hidden from" : "visible on"} the storefront.`,
      () =>
        adminCategoriesApi.update(token, category.id, {
          isVisible: !category.isVisible,
        }),
    );
  }

  function handleDelete(category) {
    if (
      !window.confirm(
        `Delete "${category.name}"? Products keep their data but lose this category.`,
      )
    )
      return undefined;
    return runAction(`Deleted "${category.name}".`, () =>
      adminCategoriesApi.remove(token, category.id),
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl">Categories</h1>
        <p className="text-sm text-ink/50 mt-1">
          Organize perfumes, bottles, and accessories for browsing and filters.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3 mb-4">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-ink border border-border bg-surface px-4 py-3 mb-4">
          {notice}
        </p>
      )}

      <div className="admin-card mb-6">
        {/* grid-cols-3 never collapsed, so on a tablet or phone the
            name field, the parent select and the submit button were
            each about a third of a narrow screen. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-end">
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
            {loading && (
              <tr>
                <td colSpan={5} className="text-center text-ink/40 py-8">
                  Loading categories…
                </td>
              </tr>
            )}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink/40 py-8">
                  {error ? "Couldn't load categories." : "No categories yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
