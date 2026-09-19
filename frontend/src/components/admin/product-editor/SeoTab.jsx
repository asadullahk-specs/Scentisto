export default function SeoTab({ form, setForm, onSave, saving }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <label className="admin-label">Meta Title</label>
        <input
          className="admin-input"
          value={form.metaTitle || ""}
          onChange={set("metaTitle")}
        />
      </div>
      <div>
        <label className="admin-label">Meta Description</label>
        <textarea
          className="admin-input"
          value={form.metaDescription || ""}
          onChange={set("metaDescription")}
        />
      </div>
      <div>
        <label className="admin-label">Meta Keywords</label>
        <input
          className="admin-input"
          placeholder="comma, separated, keywords"
          value={form.metaKeywords || ""}
          onChange={set("metaKeywords")}
        />
      </div>
      <div>
        <label className="admin-label">Canonical URL</label>
        <input
          className="admin-input"
          value={form.canonicalUrl || ""}
          onChange={set("canonicalUrl")}
        />
      </div>
      <button className="admin-btn" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save SEO"}
      </button>
    </div>
  );
}
