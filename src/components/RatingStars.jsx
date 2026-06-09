import { Star } from "lucide-react";

const iconSizes = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
};

export default function RatingStars({
  rating = 0,
  reviewCount = 0,
  size = "sm",
  showReviews = true,
  className = "",
  labelClassName = "text-xs font-bold text-slate-500",
}) {
  const ratingValue = clamp(Number(rating) || 0, 0, 5);
  const reviews = getReviewCount(reviewCount);
  const iconClassName = iconSizes[size] || iconSizes.sm;
  const ariaLabel = `${ratingValue.toFixed(1)} out of 5 stars${
    showReviews ? `, ${formatReviewLabel(reviews)}` : ""
  }`;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={ariaLabel}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => {
          const fillPercent = clamp((ratingValue - index) * 100, 0, 100);

          return (
            <span key={index} className="relative inline-flex shrink-0">
              <Star className={`${iconClassName} text-amber-200`} />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                <Star className={`${iconClassName} fill-amber-500 text-amber-500`} />
              </span>
            </span>
          );
        })}
      </span>
      {showReviews && <span className={labelClassName}>{formatReviewLabel(reviews)}</span>}
    </span>
  );
}

function getReviewCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function formatReviewLabel(count) {
  if (!count) return "No reviews yet";
  return `${count} ${count === 1 ? "review" : "reviews"}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
