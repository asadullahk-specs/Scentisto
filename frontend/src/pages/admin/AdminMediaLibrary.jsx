import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Pagination from "../../components/admin/Pagination";
import { adminMediaLibraryApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { imageProps, videoPosterUrl } from "../../utils/media";

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
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  // Debounced: the library was issuing one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminMediaLibraryApi.list(token, {
        type,
        search,
        page,
        perPage: 24,
      });
      setMedia(data.media || []);
      setMeta(data.meta);
    } catch (err) {
      setError(err.message);
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

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          className="admin-input sm:max-w-xs"
          placeholder="Search by product or alt text..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-input w-full sm:w-40"
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

      {error && (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink/40">Loading media...</p>
      ) : media.length === 0 ? (
        <p className="text-sm text-ink/40">
          No media found yet - add media from within a product's Media tab.
        </p>
      ) : (
        // Two problems here, both about weight rather than looks:
        //   - grid-cols-5 never collapsed, so on a phone or tablet
        //     each tile was a sliver.
        //   - every video tile mounted a Google Drive player iframe.
        //     At perPage:24 that is up to 24 embedded players loading
        //     at once just to browse thumbnails, and every image tile
        //     downloaded the full-size original to fill a 112px box.
        // Videos now render a generated poster frame, and images are
        // requested at thumbnail width.
        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {media.map((m) => {
            const previewUrl =
              m.mediaType === "video" ? videoPosterUrl(m.url, 320) : m.url;
            return (
            <div key={m.id} className="admin-card p-3">
              <div className="relative w-full h-28 bg-surface border border-border overflow-hidden mb-2">
                {previewUrl ? (
                  <img
                    {...imageProps(previewUrl, { width: 320, maxWidth: 480 })}
                    alt={m.altText || ""}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-luxury text-ink/30">
                    No preview
                  </div>
                )}
                {m.mediaType === "video" && (
                  <span className="absolute bottom-1 left-1 badge bg-bg/90 text-[10px]">
                    Video
                  </span>
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
            );
          })}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </AdminLayout>
  );
}
