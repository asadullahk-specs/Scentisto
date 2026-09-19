import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { adminReviewsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const STATUS_TABS = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["", "All"],
];

export default function AdminReviews() {
  const { token } = useAdminAuth();
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminReviewsApi.list(token, {
        status: status || undefined,
        perPage: 30,
      });
      setReviews(data.reviews);
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatus(review, newStatus) {
    await adminReviewsApi.setStatus(token, review.id, newStatus);
    load();
  }

  async function handleFeature(review) {
    await adminReviewsApi.setFeatured(token, review.id, !review.isFeatured);
    load();
  }

  async function handleReply(review) {
    const text = replyDrafts[review.id];
    if (!text) return;
    await adminReviewsApi.reply(token, review.id, text);
    setReplyDrafts((d) => ({ ...d, [review.id]: "" }));
    load();
  }

  async function handleDelete(review) {
    if (!window.confirm("Delete this review permanently?")) return;
    await adminReviewsApi.remove(token, review.id);
    load();
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl mb-1">Reviews</h1>
      <p className="text-sm text-ink/50 mb-6">
        Approve, moderate, and reply to customer product feedback.
      </p>

      <div className="flex items-center gap-2 mb-6 border-b border-border">
        {STATUS_TABS.map(([value, label]) => (
          <button
            key={value}
            className={status === value ? "tab-btn-active" : "tab-btn"}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink/40">No reviews here.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="admin-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm">
                    {review.customerName} · {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </div>
                  <div className="text-xs text-ink/40">
                    {review.productId?.name || "Unknown product"} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="badge">{review.status}</span>
              </div>

              <p className="text-sm text-ink/70 mb-3">{review.reviewText}</p>

              {review.images?.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {review.images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="w-16 h-16 object-cover border border-border"
                    />
                  ))}
                </div>
              )}

              {review.adminReply && (
                <div className="text-xs text-ink/60 bg-surface border border-border p-2 mb-3">
                  <strong>Reply:</strong> {review.adminReply}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                {review.status !== "approved" && (
                  <button
                    className="hover:underline"
                    onClick={() => handleStatus(review, "approved")}
                  >
                    Approve
                  </button>
                )}
                {review.status !== "rejected" && (
                  <button
                    className="hover:underline"
                    onClick={() => handleStatus(review, "rejected")}
                  >
                    Reject
                  </button>
                )}
                <button
                  className="hover:underline"
                  onClick={() => handleFeature(review)}
                >
                  {review.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  className="hover:underline text-ink/50"
                  onClick={() => handleDelete(review)}
                >
                  Delete
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  className="admin-input flex-1"
                  placeholder="Write a reply..."
                  value={replyDrafts[review.id] || ""}
                  onChange={(e) =>
                    setReplyDrafts((d) => ({
                      ...d,
                      [review.id]: e.target.value,
                    }))
                  }
                />
                <button
                  className="admin-btn-outline"
                  onClick={() => handleReply(review)}
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
