import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { adminReviewsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import useAdminAction from "../../hooks/useAdminAction";

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
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminReviewsApi.list(token, {
        status: status || undefined,
        perPage: 30,
      });
      setReviews(data.reviews || []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  const { run, error, notice, busyId } = useAdminAction(load);

  useEffect(() => {
    load();
  }, [load]);

  function handleStatus(review, newStatus) {
    return run(() => adminReviewsApi.setStatus(token, review.id, newStatus), {
      id: review.id,
      successMessage:
        newStatus === "approved"
          ? "Review approved and now visible on the storefront."
          : `Review ${newStatus}.`,
    });
  }

  function handleFeature(review) {
    return run(
      () => adminReviewsApi.setFeatured(token, review.id, !review.isFeatured),
      {
        id: review.id,
        successMessage: review.isFeatured
          ? "Removed from featured testimonials."
          : "Added to featured testimonials.",
      },
    );
  }

  async function handleReply(review) {
    const text = replyDrafts[review.id];
    if (!text) return;
    // The draft is only cleared once the server confirms the reply -
    // clearing first meant a failed request silently discarded what
    // the admin had typed.
    const result = await run(
      () => adminReviewsApi.reply(token, review.id, text),
      { id: review.id, successMessage: "Reply posted." },
    );
    if (result !== undefined) {
      setReplyDrafts((d) => ({ ...d, [review.id]: "" }));
    }
  }

  function handleDelete(review) {
    if (!window.confirm("Delete this review permanently?")) return undefined;
    return run(() => adminReviewsApi.remove(token, review.id), {
      id: review.id,
      successMessage: "Review deleted.",
    });
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl mb-1">Reviews</h1>
      <p className="text-sm text-ink/50 mb-6">
        Approve, moderate, and reply to customer product feedback.
      </p>

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

      <div className="scroll-x flex items-center gap-2 mb-6 border-b border-border">
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
