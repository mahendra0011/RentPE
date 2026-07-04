import { Router } from "express";

import { isMongoConnected } from "../config/db.js";
import Review from "../models/Review.js";

const router = Router();

// In-memory fallback reviews
const memoryReviews = [];

// GET /api/reviews/:roomSlug - Fetch reviews for a room
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

// POST /api/reviews/:roomSlug - Add a review for a room
router.post("/:roomSlug", async (request, response, next) => {
  try {
    const { roomSlug } = request.params;
    const { userName, userEmail, rating, comment } = request.body;

    if (!userName || !rating || !comment) {
      response.status(400).json({ message: "userName, rating, and comment are required." });
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
      const review = await Review.create({
        roomSlug,
        userName,
        userEmail: (userEmail || "").toLowerCase().trim(),
        rating: ratingNum,
        comment,
      });
      response.status(201).json(review);
      return;
    }

    const review = {
      _id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomSlug,
      userName,
      userEmail: (userEmail || "").toLowerCase().trim(),
      rating: ratingNum,
      comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryReviews.unshift(review);
    response.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

export default router;