const FLAGS = [
  ["isVisible", "Visible"],
  ["isFeatured", "Featured"],
  ["isTopSelling", "Top Selling"],
  ["isBestSeller", "Best Seller"],
  ["isTrending", "Trending"],
  ["isLimitedEdition", "Limited Edition"],
  ["isNewArrival", "New Arrival"],
  ["isFlashSale", "Flash Sale"],
  ["showOnHomepage", "Show on Homepage"],
  ["isCategoryFeatured", "Category Featured"],
  ["isRecommended", "Recommended"],
  ["isGiftEligible", "Gift Eligible"],
];

export default function GeneralTab({
  form,
  setForm,
  categories,
  onSave,
  saving,
}) {
  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="admin-label">Product Type *</label>
          <select
            className="admin-input"
            value={form.type || "perfume"}
            onChange={set("type")}
          >
            <option value="perfume">Perfume</option>
            <option value="bottle">Bottle</option>
            <option value="gift_pack">Gift Pack</option>
            <option value="accessory">Accessory</option>
          </select>
        </div>
        <div>
          <label className="admin-label">Category</label>
          <select
            className="admin-input"
            value={form.categoryId || ""}
            onChange={set("categoryId")}
          >
            <option value=""> - None - </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="admin-label">Name *</label>
          <input
            className="admin-input"
            value={form.name || ""}
            onChange={set("name")}
          />
        </div>
        <div>
          <label className="admin-label">Slug</label>
          <input
            className="admin-input"
            placeholder="auto-generated from name if left blank"
            value={form.slug || ""}
            onChange={set("slug")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="admin-label">SKU *</label>
          <input
            className="admin-input"
            value={form.sku || ""}
            onChange={set("sku")}
          />
        </div>
        <div>
          <label className="admin-label">Barcode</label>
          <input
            className="admin-input"
            value={form.barcode || ""}
            onChange={set("barcode")}
          />
        </div>
      </div>

      <div>
        <label className="admin-label">Short Description</label>
        <input
          className="admin-input"
          value={form.shortDescription || ""}
          onChange={set("shortDescription")}
        />
      </div>
      <div>
        <label className="admin-label">Full Description</label>
        <textarea
          className="admin-input min-h-[100px]"
          value={form.description || ""}
          onChange={set("description")}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="admin-label">Base Price (Rs.) *</label>
          <input
            type="number"
            step="1"
            placeholder="e.g. 2500"
            className="admin-input"
            value={form.price ?? ""}
            onChange={set("price")}
          />
          <p className="text-xs text-ink/40 mt-1">
            Used when the product has no ML variants.
          </p>
        </div>
        <div>
          <label className="admin-label">Sale Price (Rs.)</label>
          <input
            type="number"
            step="1"
            placeholder="e.g. 1999"
            className="admin-input"
            value={form.salePrice ?? ""}
            onChange={set("salePrice")}
          />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.hasVariants)}
              onChange={set("hasVariants")}
            />
            Has ML variants (price by size instead)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="admin-label">Gender</label>
          <select
            className="admin-input"
            value={form.gender || ""}
            onChange={set("gender")}
          >
            <option value=""> - </option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>
        <div>
          <label className="admin-label">Fragrance Family</label>
          <input
            className="admin-input"
            placeholder="Woody, Floral, Citrus..."
            value={form.fragranceFamily || ""}
            onChange={set("fragranceFamily")}
          />
        </div>
        <div>
          <label className="admin-label">Status</label>
          <select
            className="admin-input"
            value={form.status || "draft"}
            onChange={set("status")}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <label className="admin-label mb-3">Flags</label>
        <div className="grid grid-cols-3 gap-y-2 gap-x-4">
          {FLAGS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={set(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button className="admin-btn" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
