import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    roomSlug: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, lowercase: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

reviewSchema.index({ roomSlug: 1, createdAt: -1 });
reviewSchema.index({ roomSlug: 1, userEmail: 1 }, { unique: true, partialFilterExpression: { userEmail: { $ne: "" } } });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;