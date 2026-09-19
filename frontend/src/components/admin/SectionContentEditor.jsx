import ProductMultiSelect from "./ProductMultiSelect";

const FLAG_OPTIONS = [
  ["isFeatured", "Featured"],
  ["isBestSeller", "Best Seller"],
  ["isTopSelling", "Top Selling"],
  ["isTrending", "Trending"],
  ["isLimitedEdition", "Limited Edition"],
  ["isNewArrival", "New Arrival"],
  ["isFlashSale", "Flash Sale"],
];

/** Renders a form appropriate to `type`; always edits a plain `content` object. */
export default function SectionContentEditor({ type, content, onChange }) {
  const set = (key) => (e) => onChange({ ...content, [key]: e.target.value });
  const setVal = (key) => (value) => onChange({ ...content, [key]: value });

  if (type === "hero") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <Field
          label="Subheading"
          value={content.subheading}
          onChange={set("subheading")}
          textarea
        />
        <Field
          label="Image URL"
          value={content.imageUrl}
          onChange={set("imageUrl")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Primary Button Label"
            value={content.primaryLabel}
            onChange={set("primaryLabel")}
          />
          <Field
            label="Primary Button Link"
            value={content.primaryLink}
            onChange={set("primaryLink")}
          />
          <Field
            label="Secondary Button Label"
            value={content.secondaryLabel}
            onChange={set("secondaryLabel")}
          />
          <Field
            label="Secondary Button Link"
            value={content.secondaryLink}
            onChange={set("secondaryLink")}
          />
        </div>
      </div>
    );
  }

  if (type === "offer_banner") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <Field
          label="Subheading"
          value={content.subheading}
          onChange={set("subheading")}
        />
        <Field
          label="Image URL"
          value={content.imageUrl}
          onChange={set("imageUrl")}
        />
        <Field label="Link" value={content.link} onChange={set("link")} />
      </div>
    );
  }

  if (type === "featured_products") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <div>
          <label className="admin-label">Source</label>
          <select
            className="admin-input"
            value={content.sourceType || "auto"}
            onChange={set("sourceType")}
          >
            <option value="auto">Auto (by flag)</option>
            <option value="manual">Manual (pick products)</option>
          </select>
        </div>
        {content.sourceType === "manual" ? (
          <div>
            <label className="admin-label">Products</label>
            <ProductMultiSelect
              value={content.productIds || []}
              onChange={setVal("productIds")}
            />
          </div>
        ) : (
          <div>
            <label className="admin-label">Flag</label>
            <select
              className="admin-input"
              value={content.flag || "isFeatured"}
              onChange={set("flag")}
            >
              {FLAG_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <Field
          label="Max Items"
          value={content.limit}
          onChange={set("limit")}
          type="number"
        />
      </div>
    );
  }

  if (type === "collections") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <p className="text-xs text-ink/40">
          This section always shows exactly two tiles - Perfumes and
          Bottles, linking to those pages. Set their images below.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Perfumes Image URL"
            value={content.perfumesImageUrl}
            onChange={set("perfumesImageUrl")}
          />
          <Field
            label="Bottles Image URL"
            value={content.bottlesImageUrl}
            onChange={set("bottlesImageUrl")}
          />
        </div>
      </div>
    );
  }

  if (type === "brand_story") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <Field
          label="Body"
          value={content.body}
          onChange={set("body")}
          textarea
        />
        <Field
          label="Image URL"
          value={content.imageUrl}
          onChange={set("imageUrl")}
        />
      </div>
    );
  }

  if (type === "testimonials") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <Field
          label="Max Reviews"
          value={content.limit}
          onChange={set("limit")}
          type="number"
        />
        <p className="text-xs text-ink/40">
          Pulls the most recent approved (featured-first) reviews.
        </p>
      </div>
    );
  }

  if (type === "instagram_feed") {
    return (
      <div className="space-y-3">
        <Field
          label="Heading"
          value={content.heading}
          onChange={set("heading")}
        />
        <div>
          <label className="admin-label">Image URLs (one per line)</label>
          <textarea
            className="admin-input min-h-[100px]"
            value={(content.imageUrls || []).join("\n")}
            onChange={(e) =>
              onChange({
                ...content,
                imageUrls: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-ink/40">No editor for this section type yet.</p>
  );
}

function Field({ label, value, onChange, textarea, type = "text" }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      {textarea ? (
        <textarea
          className="admin-input"
          value={value || ""}
          onChange={onChange}
        />
      ) : (
        <input
          type={type}
          className="admin-input"
          value={value ?? ""}
          onChange={onChange}
        />
      )}
    </div>
  );
}
