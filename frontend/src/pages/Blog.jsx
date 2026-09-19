import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import { publicBlogsApi } from "../api/publicApi";

export default function Blog() {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get("tag") || "";
  const [blogs, setBlogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await publicBlogsApi.list({
        tag: tag || undefined,
        page,
        perPage: 9,
      });
      setBlogs(data.blogs);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [tag, page]);

  useEffect(() => {
    setPage(1);
  }, [tag]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-center mb-14">
          <h1 className="text-3xl tracking-luxury mb-2">The Journal</h1>
          <p className="text-sm text-ink/50">
            Fragrance notes, gifting guides, and stories from Scentisto.
          </p>
          {tag && (
            <p className="text-xs text-ink/40 mt-3">
              Filtered by <span className="text-ink">#{tag}</span> -{" "}
              <Link to="/blog" className="underline">
                clear
              </Link>
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-center text-sm text-ink/40">Loading...</p>
        ) : blogs.length === 0 ? (
          <p className="text-center text-sm text-ink/40">
            No posts yet - check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {blogs.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group block"
              >
                <div className="aspect-[4/3] bg-surface overflow-hidden mb-4">
                  {post.featuredImageUrl && (
                    <img
                      src={post.featuredImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <h2 className="text-lg mb-1 group-hover:text-ink/70 transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-ink/50 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                {post.publishedAt && (
                  <p className="text-xs text-ink/35 mt-2">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-14 text-sm">
            <button
              className="admin-btn-outline"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-ink/50">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              className="admin-btn-outline"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
