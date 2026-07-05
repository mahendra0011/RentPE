import { Router } from "express";
import rateLimit from "express-rate-limit";

import { isMongoConnected } from "../config/db.js";
import Review from "../models/Review.js";
import Room from "../models/Room.js";
import { requireAuth } from "../middleware/auth.js";

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many reviews. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

const memoryReviews = [];

async function syncRoomRating(roomSlug) {
  if (!isMongoConnected()) return;
  const stats = await Review.aggregate([
    { $match: { roomSlug } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const count = stats.length > 0 ? stats[0].count : 0;
  await Room.updateOne(
    { slug: roomSlug },
    { $set: { "owner.rating": avg, "owner.reviewCount": count } },
  );
}

router.get("/:roomSlug", async (request, response, next) => {
  try {
    const { roomSlug } = request.params;

    if (isMongoConnected()) {
      const reviews = await Review.find({ roomSlug }).sort({ createdAt: -1 }).lean();
      response.json(reviews);
      return;
    }

    const reviews = memoryReviews
      .filter((r) => r.roomSlug === roomSlug)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    response.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.get("/my/reviews", requireAuth, async (request, response, next) => {
  try {
    const email = request.authUser.email || "";
    if (isMongoConnected()) {
      const reviews = await Review.find({ userEmail: email }).sort({ createdAt: -1 }).lean();
      response.json(reviews);
      return;
    }
    const reviews = memoryReviews
      .filter((r) => r.userEmail === email)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    response.json(reviews);
  } catch (error) {
    next(error);
  }
});

router.post("/:roomSlug", reviewLimiter, requireAuth, async (request, response, next) => {
  try {
    const { roomSlug } = request.params;
    const { rating, comment } = request.body;
    const user = request.authUser;

    if (!rating || !comment) {
      response.status(400).json({ message: "Rating and comment are required." });
      return;
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      response.status(400).json({ message: "Rating must be between 1 and 5." });
      return;
    }

    if (comment.length > 1000) {
      response.status(400).json({ message: "Comment must be under 1000 characters." });
      return;
    }

    if (isMongoConnected()) {
      const room = await Room.findOne({ slug: roomSlug }).lean();
      if (!room) {
        response.status(404).json({ message: "Room not found." });
        return;
      }
      if (room.ownerEmail === (user.email || "")) {
        response.status(403).json({ message: "You cannot review your own room." });
        return;
      }
    }

    if (isMongoConnected()) {
      const review = await Review.create({
        roomSlug,
        userName: user.name || (user.email ? user.email.split("@")[0] : "Anonymous"),
        userEmail: user.email || "",
        rating: ratingNum,
        comment,
      });
      await syncRoomRating(roomSlug);
      response.status(201).json(review);
      return;
    }

    const review = {
      _id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomSlug,
      userName: user.name || (user.email ? user.email.split("@")[0] : "Anonymous"),
      userEmail: user.email || "",
      rating: ratingNum,
      comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryReviews.unshift(review);
    response.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ message: "You have already reviewed this room." });
      return;
    }
    next(error);
  }
});

router.put("/:reviewId", requireAuth, async (request, response, next) => {
  try {
    const { reviewId } = request.params;
    const { rating, comment } = request.body;
    const user = request.authUser;
    const userEmail = user.email || "";

    if (!isMongoConnected()) {
      const idx = memoryReviews.findIndex((r) => r._id === reviewId && r.userEmail === userEmail);
      if (idx === -1) {
        response.status(404).json({ message: "Review not found." });
        return;
      }
      if (rating) memoryReviews[idx].rating = Number(rating);
      if (comment) memoryReviews[idx].comment = comment;
      memoryReviews[idx].updatedAt = new Date().toISOString();
      response.json(memoryReviews[idx]);
      return;
    }

    const review = await Review.findOne({ _id: reviewId, userEmail });
    if (!review) {
      response.status(404).json({ message: "Review not found." });
      return;
    }

    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment;
    await review.save();
    await syncRoomRating(review.roomSlug);
    response.json(review);
  } catch (error) {
    next(error);
  }
});

router.delete("/:reviewId", requireAuth, async (request, response, next) => {
  try {
    const { reviewId } = request.params;
    const user = request.authUser;
    const userEmail = user.email || "";

    if (!isMongoConnected()) {
      const idx = memoryReviews.findIndex((r) => r._id === reviewId && r.userEmail === userEmail);
      if (idx === -1) {
        response.status(404).json({ message: "Review not found." });
        return;
      }
      const [deleted] = memoryReviews.splice(idx, 1);
      response.json({ message: "Review deleted.", review: deleted });
      return;
    }

    const review = await Review.findOne({ _id: reviewId, userEmail });
    if (!review) {
      response.status(404).json({ message: "Review not found." });
      return;
    }
    const { roomSlug } = review;
    await Review.deleteOne({ _id: reviewId });
    await syncRoomRating(roomSlug);
    response.json({ message: "Review deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;
