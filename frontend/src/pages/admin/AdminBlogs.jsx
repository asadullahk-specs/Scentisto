import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Pagination from "../../components/admin/Pagination";
import { adminBlogsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminBlogsApi.list(token, {
        status: status || undefined,
        search: search || undefined,
        page,
        perPage: 20,
      });
      setBlogs(data.blogs);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [token, status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublish(blog) {
    await adminBlogsApi.setStatus(
      token,
      blog.id,
      blog.status === "published" ? "draft" : "published",
    );
    load();
  }

  async function handleDelete(blog) {
    if (!window.confirm(`Delete "${blog.title}" permanently?`)) return;
    await adminBlogsApi.remove(token, blog.id);
    load();
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-1">
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
