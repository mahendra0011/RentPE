import { Star, User, ThumbsUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { addReview, fetchReviews } from "@/store/reviewsSlice.js";

const SAMPLE_REVIEWS = [
  {
    _id: "sample-1",
    roomSlug: "",
    userName: "Priya Sharma",
    rating: 5,
    comment:
      "Excellent place! The owner is very cooperative and the rooms are well-maintained. Great location with all amenities nearby.",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "sample-2",
    roomSlug: "",
    userName: "Amit Kumar",
    rating: 4,
    comment:
      "Good value for money. Clean rooms and the mess food is decent. WiFi works well most of the time.",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "sample-3",
    roomSlug: "",
    userName: "Neha Patel",
    rating: 5,
    comment:
      "I've been living here for 6 months and it's been a wonderful experience. The owner is responsive and the property is safe.",
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return "";
  }
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StarRatingDisplay({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-amber-500 text-amber-500" : "text-amber-200"}`}
        />
      ))}
    </span>
  );
}

export default function ReviewsSection({ roomSlug, onReviewsLoaded }) {
  const dispatch = useDispatch();
  const { byRoom, status } = useSelector((state) => state.reviews);
  const reviews = byRoom[roomSlug] || [];
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ userName: "", rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    dispatch(fetchReviews(roomSlug));
  }, [dispatch, roomSlug]);

  useEffect(() => {
    if (onReviewsLoaded && status === "succeeded") {
      onReviewsLoaded(reviews.length);
    }
  }, [reviews, status, onReviewsLoaded]);

  const isLoading = status === "loading" && reviews.length === 0;
  const displayReviews = reviews.length > 0 ? reviews : SAMPLE_REVIEWS;

  function averageRating() {
    if (!displayReviews.length) return 0;
    const sum = displayReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / displayReviews.length).toFixed(1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.userName.trim() || !formData.comment.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      await dispatch(
        addReview({
          roomSlug,
          userName: formData.userName.trim(),
          rating: formData.rating,
          comment: formData.comment.trim(),
        }),
      ).unwrap();
      setFormData({ userName: "", rating: 5, comment: "" });
      setShowForm(false);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border-t border-slate-200 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">Reviews</h2>
          {displayReviews.length > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1 font-black text-amber-500">
                {averageRating()}
                <Star className="size-3.5 fill-amber-500 text-amber-500" />
              </span>
              <span>
                {displayReviews.length} {displayReviews.length === 1 ? "review" : "reviews"}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-black text-background transition-colors hover:bg-slate-800"
        >
          {showForm ? "Cancel" : "Write a review"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl border border-slate-200 bg-card p-5 shadow-sm"
        >
          <h3 className="mb-4 text-sm font-black">Share your experience</h3>

          <div className="mb-4">
            <label htmlFor="review-name" className="mb-1.5 block text-xs font-bold text-slate-500">
              Your name
            </label>
            <input
              id="review-name"
              type="text"
              required
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              placeholder="e.g. Rahul Singh"
              className="w-full rounded-xl border border-slate-200 bg-background px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-brand"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="transition-transform hover:scale-110"
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`size-6 ${
                      star <= formData.rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-amber-200"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-slate-500">{formData.rating}/5</span>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="review-comment"
              className="mb-1.5 block text-xs font-bold text-slate-500"
            >
              Your review
            </label>
            <textarea
              id="review-comment"
              required
              maxLength={1000}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Tell others about your experience staying here..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-background px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-brand"
            />
            <p className="mt-1 text-right text-[10px] font-bold text-slate-400">
              {formData.comment.length}/1000
            </p>
          </div>

          {submitError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-black text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : displayReviews.length > 0 ? (
        <div className="grid gap-4">
          {displayReviews.map((review) => (
            <div
              key={review._id}
              className="rounded-2xl border border-slate-200 bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-black text-brand">
                  {getInitials(review.userName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-ink">{review.userName}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Clock className="size-3" />
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <StarRatingDisplay rating={review.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-card p-8 text-center">
          <User className="mx-auto mb-2 size-8 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">No reviews yet</p>
          <p className="mt-1 text-xs text-slate-400">Be the first to share your experience!</p>
        </div>
      )}
    </section>
  );
}