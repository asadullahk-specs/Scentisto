import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import MediaUrlField from "../../components/admin/MediaUrlField";
import { adminBlogsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const BLANK = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featuredImageUrl: "",
  tags: "",
  status: "draft",
  isFeatured: false,
  metaTitle: "",
  metaDescription: "",
};

export default function AdminBlogEditor() {
  const { token } = useAdminAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        const data = await adminBlogsApi.get(token, id);
        setForm({
          title: data.blog.title,
          slug: data.blog.slug,
          excerpt: data.blog.excerpt || "",
          content: data.blog.content,
          featuredImageUrl: data.blog.featuredImageUrl || "",
          tags: (data.blog.tags || []).join(", "),
          status: data.blog.status,
          isFeatured: data.blog.isFeatured,
          metaTitle: data.blog.metaTitle || "",
          metaDescription: data.blog.metaDescription || "",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, id, isEdit]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(publish) {
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      excerpt: form.excerpt || null,
      content: form.content,
      featuredImageUrl: form.featuredImageUrl || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isFeatured: form.isFeatured,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      status: publish ? "published" : form.status,
    };
    try {
      if (isEdit) {
        await adminBlogsApi.update(token, id, payload);
      } else {
        const created = await adminBlogsApi.create(token, payload);
        navigate(`/admin/blogs/${created.blog.id}/edit`, { replace: true });
        setSaving(false);
        return;
      }
      navigate("/admin/blogs");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-ink/40">Loading...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl mb-1">{isEdit ? "Edit Post" : "New Post"}</h1>
      <p className="text-sm text-ink/50 mb-6">
        {isEdit
          ? "Update this blog post."
          : "Draft first - publish when it's ready."}
      </p>

      {error && (
        <p className="text-sm text-ink/70 border border-border p-3 mb-4 bg-surface">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-5">
          <div>
            <label className="admin-label">Title</label>
            <input
              className="admin-input"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">Slug</label>
            <input
              className="admin-input"
              placeholder="auto-generated from title if left blank"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">Excerpt</label>
            <textarea
              className="admin-input"
              rows={2}
              maxLength={500}
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">Content</label>
            <textarea
              className="admin-input font-mono text-xs"
              rows={16}
              placeholder="Markdown or HTML - rendered as-is by the storefront post page."
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
            />
          </div>

          <div>
            <label className="admin-label">SEO Meta Title</label>
            <input
              className="admin-input"
              value={form.metaTitle}
              onChange={(e) => set("metaTitle", e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">SEO Meta Description</label>
            <textarea
              className="admin-input"
              rows={2}
              value={form.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-card">
            <div className="admin-label mb-3">Publishing</div>
            <div className="text-sm mb-3">
              Status: <span className="badge">{form.status}</span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="admin-btn"
                disabled={saving || !form.title || !form.content}
                onClick={() => handleSave(true)}
              >
                Publish
              </button>
              <button
                className="admin-btn-outline"
                disabled={saving || !form.title || !form.content}
                onClick={() => handleSave(false)}
              >
                Save Draft
              </button>
            </div>
          </div>

          <MediaUrlField
            label="Featured Image"
            url={form.featuredImageUrl}
            onUrlChange={(v) => set("featuredImageUrl", v)}
            hint="Google Drive share link or direct image URL."
          />

          <div>
            <label className="admin-label">Tags</label>
            <input
              className="admin-input"
              placeholder="fragrance-tips, gifting, new-launch"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
            <p className="text-xs text-ink/40 mt-1">Comma-separated.</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => set("isFeatured", e.target.checked)}
            />
            Feature this post
          </label>
        </div>
      </div>
    </AdminLayout>
  );
}
