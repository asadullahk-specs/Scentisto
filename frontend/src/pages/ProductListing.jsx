import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import ProductCard from "../components/public/ProductCard";
import FilterSidebar from "../components/public/FilterSidebar";
import Pagination from "../components/public/Pagination";
import { publicProductsApi, publicCategoriesApi } from "../api/publicApi";

const SORT_OPTIONS = [
  ["newest", "Newest"],
  ["price_low_high", "Price: Low to High"],
  ["price_high_low", "Price: High to Low"],
  ["popularity", "Popularity"],
  ["best_selling", "Best Selling"],
];

function flattenCategories(nodes) {
  return nodes.flatMap((node) => [
    node,
    ...flattenCategories(node.children || []),
  ]);
}

/**
 * @param {object} baseFilters - fixed filters for this page, e.g.
 *   { type: 'perfume' } for /perfumes, { isBestSeller: true } for
 *   /best-sellers, { collection: slug } for /collections/:slug.
 *   Merged underneath whatever the shopper picks in the sidebar.
 */
export default function ProductListing({
  title,
  subtitle,
  baseFilters = {},
  useSearchQuery = false,
}) {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    fragranceFamily: "",
    gender: "",
    inStock: false,
    sortBy: "newest",
    page: 1,
  });

  useEffect(() => {
    publicCategoriesApi
      .list()
      .then((data) => setCategories(flattenCategories(data.categories || [])))
      // A failed category fetch must not take the whole page down -
      // the grid is still perfectly usable without the filter list.
      .catch(() => setCategories([]));
  }, []);

  // Reset to page 1 whenever the shopper changes a filter (not on page
  // change itself).
  //
  // The guard matters: this previously called setFilters
  // unconditionally, so on mount it replaced `filters` with a new
  // object that was value-identical but reference-different. `load`
  // depends on `filters`, so it was recreated, and the effect below
  // re-ran - meaning every visit to a listing page fired the products
  // request twice. Only set state when the page actually needs moving.
  const filterKey = JSON.stringify({ ...filters, page: undefined });
  useEffect(() => {
    setFilters((f) => (f.page === 1 ? f : { ...f, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const searchQuery = useSearchQuery ? searchParams.get("q") || "" : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await publicProductsApi.list({
        ...baseFilters,
        category: filters.category || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        fragranceFamily: filters.fragranceFamily || undefined,
        gender: filters.gender || undefined,
        inStock: filters.inStock ? "true" : undefined,
        search: searchQuery || undefined,
        sortBy: filters.sortBy,
        page: filters.page,
        perPage: 12,
      });
      setProducts(data.products);
      setMeta(data.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(baseFilters), filters, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  // Stop the page behind the filter drawer from scrolling while it is
  // open, so a flick inside the drawer doesn't move the grid instead.
  useEffect(() => {
    if (!filterDrawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filterDrawerOpen]);

  const pageTitle =
    useSearchQuery && searchQuery
      ? `Search results for "${searchQuery}"`
      : title;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <section className="bg-surface border-b border-border py-8 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h1 className="text-[clamp(1.5rem,6vw,2.25rem)] mb-2 break-words">{pageTitle}</h1>
          {subtitle && <p className="text-sm sm:text-base text-ink/50">{subtitle}</p>}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-1 w-full min-w-0">
        <div className="hidden md:block">
          <FilterSidebar
            categories={categories}
            filters={filters}
            onChange={setFilters}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 gap-2 xs:gap-3">
            <p className="text-xs xs:text-sm text-ink/50 shrink-0 truncate">
              {meta ? `Showing ${meta.total} products` : ""}
            </p>
            <div className="flex items-center gap-2 xs:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(true)}
                aria-label="Filter"
                className="md:hidden border border-border px-2.5 xs:px-4 py-2 text-xs uppercase tracking-luxury flex items-center gap-2 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                <span className="hidden xs:inline">Filter</span>
              </button>
              <select
                className="input-luxury w-24 xs:w-40 sm:w-56 text-xs xs:text-sm py-2 px-2 xs:px-4"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sortBy: e.target.value }))
                }
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* An API failure used to render a one-line message above an
              empty area with no way to recover. Each state now has an
              explicit, actionable treatment. */}
          {loading ? (
            <div className="py-16 text-center text-sm text-ink/40">
              Loading products…
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-ink/60 mb-2">Unable to load products.</p>
              <p className="text-xs text-ink/40 mb-6">{error}</p>
              <button type="button" className="btn-outline" onClick={load}>
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-ink/60 mb-4">
                No products match these filters yet.
              </p>
              <button
                type="button"
                className="btn-outline"
                onClick={() =>
                  setFilters({
                    category: "",
                    minPrice: "",
                    maxPrice: "",
                    fragranceFamily: "",
                    gender: "",
                    inStock: false,
                    sortBy: "newest",
                    page: 1,
                  })
                }
              >
                Clear Filters
              </button>
            </div>
          ) : (
            // 3 columns was the maximum at any width, so a 1440px
            // display showed the same three cards as a 1024px one with
            // enormous gutters. A fourth column comes in at xl.
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-8 sm:gap-y-10">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  imageSizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 46vw"
                />
              ))}
            </div>
          )}

          <Pagination
            meta={meta}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          filterDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-ink/40"
          onClick={() => setFilterDrawerOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 bottom-0 w-[88%] max-w-xs bg-bg overflow-y-auto overscroll-contain flex flex-col transition-transform duration-300 ${
            filterDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-xs uppercase tracking-luxury text-ink/50">Filters</span>
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(false)}
              aria-label="Close filters"
              className="text-ink/50 hover:text-ink w-10 h-10 flex items-center justify-center -mr-2"
            >
              ✕
            </button>
          </div>
          <div className="px-4 flex-1">
            <FilterSidebar
              categories={categories}
              filters={filters}
              onChange={setFilters}
            />
          </div>
          <div className="px-4 pb-6 pt-2 sticky bottom-0 bg-bg border-t border-border">
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(false)}
              className="btn-primary w-full"
            >
              Show Results
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
