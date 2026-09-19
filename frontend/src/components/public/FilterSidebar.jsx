import { useState } from "react";

const FRAGRANCE_FAMILIES = [
  "Woody",
  "Floral",
  "Oriental",
  "Citrus",
  "Leather",
  "Fresh",
  "Sweet",
];
const GENDERS = [
  ["men", "Men"],
  ["women", "Women"],
  ["unisex", "Unisex"],
];

function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-luxury text-ink/50"
      >
        {title}
        <ChevronIcon open={open} />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

function OptionRow({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block text-sm py-1 text-left w-full ${active ? "text-ink" : "text-ink/50 hover:text-ink"}`}
    >
      {label}
    </button>
  );
}

export default function FilterSidebar({ categories, filters, onChange }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <aside className="w-56 shrink-0 pr-6">
      <FilterSection title="Category">
        <div className="space-y-1">
          <OptionRow
            label="All"
            active={!filters.category}
            onClick={() => set("category", "")}
          />
          {categories.map((c) => (
            <OptionRow
              key={c.id}
              label={c.name}
              active={filters.category === c.slug}
              onClick={() => set("category", c.slug)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min (Rs.)"
            className="input-luxury text-xs py-2"
            value={filters.minPrice || ""}
            onChange={(e) => set("minPrice", e.target.value)}
          />
          <span className="text-ink/30">–</span>
          <input
            type="number"
            placeholder="Max (Rs.)"
            className="input-luxury text-xs py-2"
            value={filters.maxPrice || ""}
            onChange={(e) => set("maxPrice", e.target.value)}
          />
        </div>
      </FilterSection>

      <FilterSection title="Fragrance Family">
        <div className="space-y-1">
          {FRAGRANCE_FAMILIES.map((family) => (
            <OptionRow
              key={family}
              label={family}
              active={filters.fragranceFamily === family}
              onClick={() =>
                set(
                  "fragranceFamily",
                  filters.fragranceFamily === family ? "" : family,
                )
              }
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Gender">
        <div className="space-y-1">
          {GENDERS.map(([value, label]) => (
            <OptionRow
              key={value}
              label={label}
              active={filters.gender === value}
              onClick={() =>
                set("gender", filters.gender === value ? "" : value)
              }
            />
          ))}
        </div>
      </FilterSection>

      <div className="pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(filters.inStock)}
            onChange={(e) => set("inStock", e.target.checked)}
          />
          In Stock Only
        </label>
      </div>
    </aside>
  );
}
