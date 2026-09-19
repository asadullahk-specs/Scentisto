import { useState } from "react";
import { adminProductsApi } from "../../../api/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

function toCommaString(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}
function toArray(str) {
  return str
    ? str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

export default function DetailsTab({ productId, details }) {
  const { token } = useAdminAuth();
  const [form, setForm] = useState(() => ({
    story: details?.story || "",
    ingredients: details?.ingredients || "",
    howToUse: details?.howToUse || "",
    warnings: details?.warnings || "",
    longevity: details?.longevity || "",
    projection: details?.projection || "",
    sillage: details?.sillage || "",
    season: details?.season || "",
    occasion: details?.occasion || "",
    topNotes: toCommaString(details?.topNotes),
    middleNotes: toCommaString(details?.middleNotes),
    baseNotes: toCommaString(details?.baseNotes),
    authenticityInfo: details?.authenticityInfo || "",
    packagingInfo: details?.packagingInfo || "",
    shippingInfo: details?.shippingInfo || "",
    returnsInfo: details?.returnsInfo || "",
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await adminProductsApi.updateDetails(token, productId, {
        ...form,
        topNotes: toArray(form.topNotes),
        middleNotes: toArray(form.middleNotes),
        baseNotes: toArray(form.baseNotes),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!productId) {
    return (
      <p className="text-sm text-ink/40">
        Save the product first to add fragrance details.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="admin-label">Product Story</label>
        <textarea
          className="admin-input min-h-[90px]"
          value={form.story}
          onChange={set("story")}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="admin-label">Top Notes (comma separated)</label>
          <input
            className="admin-input"
            value={form.topNotes}
            onChange={set("topNotes")}
          />
        </div>
        <div>
          <label className="admin-label">Middle Notes</label>
          <input
            className="admin-input"
            value={form.middleNotes}
            onChange={set("middleNotes")}
          />
        </div>
        <div>
          <label className="admin-label">Base Notes</label>
          <input
            className="admin-input"
            value={form.baseNotes}
            onChange={set("baseNotes")}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="admin-label">Longevity</label>
          <input
            className="admin-input"
            placeholder="6-8 hours"
            value={form.longevity}
            onChange={set("longevity")}
          />
        </div>
        <div>
          <label className="admin-label">Projection</label>
          <input
            className="admin-input"
            value={form.projection}
            onChange={set("projection")}
          />
        </div>
        <div>
          <label className="admin-label">Sillage</label>
          <input
            className="admin-input"
            value={form.sillage}
            onChange={set("sillage")}
          />
        </div>
        <div>
          <label className="admin-label">Season</label>
          <input
            className="admin-input"
            value={form.season}
            onChange={set("season")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="admin-label">Occasion</label>
          <input
            className="admin-input"
            value={form.occasion}
            onChange={set("occasion")}
          />
        </div>
        <div>
          <label className="admin-label">Ingredients</label>
          <input
            className="admin-input"
            value={form.ingredients}
            onChange={set("ingredients")}
          />
        </div>
      </div>

      <div>
        <label className="admin-label">How To Use</label>
        <textarea
          className="admin-input"
          value={form.howToUse}
          onChange={set("howToUse")}
        />
      </div>
      <div>
        <label className="admin-label">Warnings</label>
        <textarea
          className="admin-input"
          value={form.warnings}
          onChange={set("warnings")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="admin-label">Authenticity Info</label>
          <textarea
            className="admin-input"
            value={form.authenticityInfo}
            onChange={set("authenticityInfo")}
          />
        </div>
        <div>
          <label className="admin-label">Packaging Info</label>
          <textarea
            className="admin-input"
            value={form.packagingInfo}
            onChange={set("packagingInfo")}
          />
        </div>
        <div>
          <label className="admin-label">Shipping Info</label>
          <textarea
            className="admin-input"
            value={form.shippingInfo}
            onChange={set("shippingInfo")}
          />
        </div>
        <div>
          <label className="admin-label">Returns Info</label>
          <textarea
            className="admin-input"
            value={form.returnsInfo}
            onChange={set("returnsInfo")}
          />
        </div>
      </div>

      <button className="admin-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Details"}
      </button>
      {saved && <span className="text-xs text-ink/50 ml-3">Saved.</span>}
    </div>
  );
}
