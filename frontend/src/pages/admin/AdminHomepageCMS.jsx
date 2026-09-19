import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import SectionContentEditor from "../../components/admin/SectionContentEditor";
import { adminHomepageApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const SECTION_TYPES = [
  ["hero", "Hero Banner"],
  ["offer_banner", "Offer Banner"],
  ["featured_products", "Featured Products"],
  ["collections", "Collections"],
  ["brand_story", "Brand Story"],
  ["testimonials", "Testimonials"],
  ["instagram_feed", "Instagram Feed"],
];

export default function AdminHomepageCMS() {
  const { token } = useAdminAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newType, setNewType] = useState("hero");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  /**
   * None of the actions below had a catch. Toggling a section,
   * reordering, adding or deleting could all fail server-side and the
   * admin would see the UI either do nothing or - worse, for reorder -
   * show the new order optimistically while the database kept the old
   * one, until the next refresh silently reverted it.
   */
  async function runAction(label, action, { reloadOnError = false } = {}) {
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(label);
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err.message);
      if (reloadOnError) await load();
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminHomepageApi.list(token);
      setSections(data.sections || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(section) {
    setEditingId(section.id);
    setEditForm({ title: section.title, content: section.content || {} });
  }

  async function handleSaveEdit() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminHomepageApi.update(token, editingId, editForm);
      setEditingId(null);
      await load();
      setNotice("Section saved. The storefront will pick it up shortly.");
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      // Keep the editor open on failure so the admin's unsaved copy
      // is not thrown away.
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(section) {
    return runAction(
      `"${section.title}" is now ${section.isEnabled ? "hidden" : "visible"} on the homepage.`,
      () =>
        adminHomepageApi.update(token, section.id, {
          isEnabled: !section.isEnabled,
        }),
    );
  }

  function handleMove(index, direction) {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return undefined;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next); // optimistic
    // reloadOnError restores the server's real order if the write
    // failed, instead of leaving the optimistic swap on screen.
    return runAction(
      "Section order updated.",
      () =>
        adminHomepageApi.reorder(
          token,
          next.map((sec) => sec.id),
        ),
      { reloadOnError: true },
    );
  }

  function handleAdd() {
    const label = SECTION_TYPES.find(([v]) => v === newType)?.[1] || newType;
    return runAction(`Added a ${label} section.`, () =>
      adminHomepageApi.create(token, {
        type: newType,
        title: label,
        content: {},
      }),
    );
  }

  function handleDelete(section) {
    if (!window.confirm(`Delete the "${section.title}" section?`))
      return undefined;
    return runAction(`Deleted "${section.title}".`, () =>
      adminHomepageApi.remove(token, section.id),
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl">Homepage CMS</h1>
          <p className="text-sm text-ink/50 mt-1">
            Manage and reorder your homepage sections.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            className="admin-input sm:w-48"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            {SECTION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="admin-btn" onClick={handleAdd}>
            + Add Section
          </button>
        </div>
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

      {loading ? (
        <p className="text-sm text-ink/40">Loading...</p>
      ) : sections.length === 0 ? (
        <p className="text-sm text-ink/40">No sections yet - add one above.</p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="admin-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col">
                    <button
                      className="text-ink/40 hover:text-ink text-xs"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                    >
                      ▲
                    </button>
                    <button
                      className="text-ink/40 hover:text-ink text-xs"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === sections.length - 1}
                    >
                      ▼
                    </button>
                  </div>
                  <div>
                    <div className="text-sm">{section.title}</div>
                    <div className="text-xs text-ink/40 capitalize">
                      {section.type.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <button
                    className="hover:underline"
                    onClick={() => handleToggle(section)}
                  >
                    {section.isEnabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    className="hover:underline"
                    onClick={() => startEdit(section)}
                  >
                    Edit
                  </button>
                  <button
                    className="hover:underline text-ink/50"
                    onClick={() => handleDelete(section)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingId === section.id && editForm && (
                <div className="mt-4 pt-4 border-t border-border">
                  <label className="admin-label">Admin Label</label>
                  <input
                    className="admin-input mb-4"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                  <SectionContentEditor
                    type={section.type}
                    content={editForm.content}
                    onChange={(content) =>
                      setEditForm((f) => ({ ...f, content }))
                    }
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      className="admin-btn"
                      onClick={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Section"}
                    </button>
                    <button
                      className="admin-btn-outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
