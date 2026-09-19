import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Pagination from "../../components/admin/Pagination";
import { adminBlogsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import useAdminAction from "../../hooks/useAdminAction";

const STATUS_TABS = [
  ["", "All"],
  ["published", "Published"],
  ["draft", "Draft"],
];

export default function AdminBlogs() {
  const { token } = useAdminAuth();
  const [blogs, setBlogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminBlogsApi.list(token, {
        status: status || undefined,
        search: search || undefined,
        page,
        perPage: 20,
      });
      setBlogs(data.blogs || []);
      setMeta(data.meta);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, status, search, page]);

  const { run, error, notice, busyId } = useAdminAction(load);

  useEffect(() => {
    load();
  }, [load]);

  function togglePublish(blog) {
    const next = blog.status === "published" ? "draft" : "published";
    return run(() => adminBlogsApi.setStatus(token, blog.id, next), {
      id: blog.id,
      successMessage:
        next === "published"
          ? `"${blog.title}" is now published.`
          : `"${blog.title}" moved back to draft.`,
    });
  }

  function handleDelete(blog) {
    if (!window.confirm(`Delete "${blog.title}" permanently?`)) return undefined;
    return run(() => adminBlogsApi.remove(token, blog.id), {
      id: blog.id,
      successMessage: `Deleted "${blog.title}".`,
    });
  }

  return (
    <AdminLayout>
      {(error || loadError) && (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3 mb-4">
          {error || loadError}
        </p>
      )}
      {notice && (
        <p className="text-sm text-ink border border-border bg-surface px-4 py-3 mb-4">
          {notice}
        </p>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <h1 className="text-2xl mb-1">Blogs</h1>
          <p className="text-sm text-ink/50">
            Editorial content for the storefront.
          </p>
        </div>
        <Link to="/admin/blogs/new" className="admin-btn">
          New Post
        </Link>
      </div>

      <div className="flex items-center justify-between mt-6 mb-4">
        <div className="flex gap-2">
          {STATUS_TABS.map(([value, label]) => (
            <button
              key={value}
              className={status === value ? "tab-btn-active" : "tab-btn"}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="admin-input w-64"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading...</p>
      ) : blogs.length === 0 ? (
        <p className="text-sm text-ink/40">No posts yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Views</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {blogs.map((blog) => (
              <tr key={blog.id}>
                <td>
                  <div>{blog.title}</div>
                  {blog.isFeatured && (
                    <span className="badge mt-1 inline-block">Featured</span>
                  )}
                </td>
                <td className="text-ink/60">
                  {blog.authorId
                    ? `${blog.authorId.firstName} ${blog.authorId.lastName}`
                    : " - "}
                </td>
                <td>
                  <span className="badge">{blog.status}</span>
                </td>
                <td className="text-ink/60">{blog.viewsCount}</td>
                <td className="text-ink/60">
                  {blog.publishedAt
                    ? new Date(blog.publishedAt).toLocaleDateString()
                    : " - "}
                </td>
                <td>
                  <div className="flex gap-3 text-xs justify-end">
                    <Link
                      className="hover:underline"
                      to={`/admin/blogs/${blog.id}/edit`}
                    >
                      Edit
                    </Link>
                    <button
                      className="hover:underline"
                      onClick={() => togglePublish(blog)}
                    >
                      {blog.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      className="hover:underline text-ink/50"
                      onClick={() => handleDelete(blog)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </AdminLayout>
  );
}
