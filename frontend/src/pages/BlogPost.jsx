import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import { publicBlogsApi } from "../api/publicApi";

export default function BlogPost() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    publicBlogsApi
      .getBySlug(slug)
      .then((data) => setBlog(data.blog))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div>
        <Header />
        <p className="text-center text-sm text-ink/40 py-24">Loading...</p>
        <Footer />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div>
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl mb-3">Post not found</h1>
          <Link to="/blog" className="text-sm underline">
            Back to the Journal
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-14">
        <Link
          to="/blog"
          className="text-xs text-ink/50 hover:text-ink uppercase tracking-luxury"
        >
          ← The Journal
        </Link>

        <h1 className="text-3xl mt-4 mb-3">{blog.title}</h1>

        <div className="flex items-center gap-3 text-xs text-ink/40 mb-8">
          {blog.authorId && (
            <span>
              By {blog.authorId.firstName} {blog.authorId.lastName}
            </span>
          )}
          {blog.publishedAt && (
            <span>· {new Date(blog.publishedAt).toLocaleDateString()}</span>
          )}
        </div>

        {blog.featuredImageUrl && (
          <div className="aspect-[16/9] bg-surface overflow-hidden mb-10">
            <img
              src={blog.featuredImageUrl}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/*
 Blog content is authored exclusively by admin-scope staff
 (create/edit is gated behind requireRole in
 adminBlogRoutes.js) - never user-submitted - so rendering
 it as HTML here carries the same trust boundary as any
 other CMS-authored content in this app, not an open XSS
 surface from public input.
 */}
        <div
          className="prose prose-neutral max-w-none text-ink/80 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border">
            {blog.tags.map((tag) => (
              <Link
                key={tag}
                to={`/blog?tag=${encodeURIComponent(tag)}`}
                className="text-xs text-ink/50 hover:text-ink"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
