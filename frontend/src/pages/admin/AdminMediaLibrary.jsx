import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Pagination from "../../components/admin/Pagination";
import { adminMediaLibraryApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

/**
 * This phase's Media Library is scoped to product media (aggregated
 * from every product's gallery + primary/hover images via the
 * product system built in Phase 1). A standalone media-asset entity
 * with folders and cross-page reuse tracking (homepage/blog/etc.,
 * per Section 19 of the CMS spec) is a larger data-model change
 * reserved for the phase that builds the Homepage CMS and Blog.
 */
export default function AdminMediaLibrary() {
  const { token } = useAdminAuth();
  const [media, setMedia] = useState([]);
  const [meta, setMeta] = useState(null);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminMediaLibraryApi.list(token, {
        type,
        search,
        page,
        perPage: 24,
      });
      setMedia(data.media);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [token, type, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl">Media Library</h1>
        <p className="text-sm text-ink/50 mt-1">
          Every image and video currently in use across your product catalog.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          className="admin-input max-w-xs"
          placeholder="Search by product or alt text..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="admin-input w-40"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="360">360</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading media...</p>
      ) : media.length === 0 ? (
        <p className="text-sm text-ink/40">
          No media found yet - add media from within a product's Media tab.
        </p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {media.map((m) => (
            <div key={m.id} className="admin-card p-3">
              <div className="w-full h-28 bg-surface border border-border overflow-hidden mb-2">
                {m.mediaType === "video" ? (
                  <iframe
                    src={m.url}
                    title={m.altText || "media"}
                    className="w-full h-full"
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={m.altText || ""}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
              <div className="text-xs uppercase text-ink/40 mb-1">
                {m.mediaType}
              </div>
              <Link
                to={`/admin/products/${m.productId}/edit`}
                className="text-sm hover:underline block truncate"
              >
                {m.productName}
              </Link>
            </div>
          ))}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </AdminLayout>
  );
}
