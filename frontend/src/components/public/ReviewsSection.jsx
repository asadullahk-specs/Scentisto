import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicReviewsApi } from "../../api/publicApi";
import { useCustomerAuth } from "../../context/CustomerAuthContext";

const MIN_LENGTH_WITHOUT_IMAGE = 150;
const MIN_LENGTH_WITH_IMAGE = 80;

function Stars({ rating }) {
  return (
    <span aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-ink/20">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewsSection({ productId, productSlug }) {
  const { isAuthenticated, token } = useCustomerAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const minLength = imageUrl.trim()
    ? MIN_LENGTH_WITH_IMAGE
    : MIN_LENGTH_WITHOUT_IMAGE;
  const remaining = Math.max(0, minLength - reviewText.trim().length);

  useEffect(() => {
    publicReviewsApi
      .listForProduct(productSlug, { perPage: 20 })
      .then((data) => {
        setReviews(data.reviews);
        setSummary(data.summary);
      })
      .finally(() => setLoading(false));
  }, [productSlug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    if (reviewText.trim().length < minLength) {
      setSubmitError(
        `Please write at least ${minLength} characters${imageUrl.trim() ? " (80 since you added a photo)" : ""}.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await publicReviewsApi.create(token, {
        productId,
        rating,
        reviewText: reviewText.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
      });
      setSubmitted(true);
      setShowForm(false);
      setReviewText("");
      setImageUrl("");
      setRating(5);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-20 border-t border-border pt-12">
      <h2 className="text-2xl mb-6">Customer Reviews</h2>

      <div className="flex items-start gap-10 mb-8">
        <div>
          <div className="text-4xl">
            {summary?.average?.toFixed(1) || "0.0"}
          </div>
          <Stars rating={Math.round(summary?.average || 0)} />
          <div className="text-xs text-ink/40 mt-1">
            Based on {summary?.total || 0} reviews
          </div>
        </div>
        <div className="flex-1 max-w-xs">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary?.breakdown?.[star] || 0;
            const pct = summary?.total
              ? Math.round((count / summary.total) * 100)
              : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs mb-1">
                <span className="w-3 text-ink/50">{star}</span>
                <div className="flex-1 h-1.5 bg-surface">
                  <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-ink/40 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {submitted && (
        <p className="text-sm text-ink/60 mb-6">
          Thanks - your review is awaiting approval.
        </p>
      )}

      {!showForm && (
        <>
          {isAuthenticated ? (
            <button
              className="btn-outline mb-10"
              onClick={() => setShowForm(true)}
            >
              Write a Review
            </button>
          ) : (
            <p className="text-sm text-ink/50 mb-10">
              <Link to="/login" className="underline">
                Sign in
              </Link>{" "}
              to write a review.
            </p>
          )}
        </>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-border p-6 mb-10 max-w-lg"
        >
          <label className="label-luxury">Your Rating</label>
          <div className="flex gap-1 mb-4 text-xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className={star <= rating ? "text-ink" : "text-ink/20"}
              >
                ★
              </button>
            ))}
          </div>

          <label className="label-luxury">
            Photo URL (optional - Google Drive link)
          </label>
          <input
            className="input-luxury mb-4"
            placeholder="https://drive.google.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <label className="label-luxury">Your Review</label>
          <textarea
            className="input-luxury min-h-[120px] h-[120px] resize-none"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <p className="text-xs text-ink/40 mt-1 mb-4">
            {remaining > 0
              ? `${remaining} more character${remaining === 1 ? "" : "s"} needed (minimum ${minLength}${imageUrl.trim() ? " with a photo" : ""}).`
              : "Looks good."}
          </p>

          {submitError && (
            <p className="text-sm text-ink/70 mb-4">{submitError}</p>
          )}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink/40">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink/40">
          No reviews yet - be the first to share your experience.
        </p>
      ) : (
        <div className="space-y-8">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-border pb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm">{review.customerName}</div>
                  <Stars rating={review.rating} />
                </div>
                <span className="text-xs text-ink/40">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-ink/70 mb-2">{review.reviewText}</p>
              {review.images?.length > 0 && (
                <div className="flex gap-2 mb-2">
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
                <div className="text-xs text-ink/60 bg-surface border border-border p-3 mt-2">
                  <strong>SCENTISTO:</strong> {review.adminReply}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
