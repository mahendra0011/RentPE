import { Router } from "express";

import { isMongoConnected } from "../config/db.js";
import { seedRoommates } from "../data/seedRoommates.js";
import RoommatePost from "../models/RoommatePost.js";

const router = Router();
const memoryPosts = [...seedRoommates];

function matches(post, query) {
  if (query.city && !post.city.toLowerCase().includes(String(query.city).toLowerCase())) {
    return false;
  }
  if (query.budgetMax && post.budget > Number(query.budgetMax)) return false;
  if (
    query.genderPreference &&
    query.genderPreference !== "Any" &&
    post.genderPreference !== query.genderPreference
  ) {
    return false;
  }
  return post.status === "active";
}

function normalizePost(body) {
  const name = String(body.name || "").trim();
  const city = String(body.city || "").trim();
  const budget = Number(body.budget || 0);
  const phone = String(body.phone || "").replace(/\D/g, "");

  if (!name || !city || !budget || phone.length < 10) {
    const error = new Error("Name, city, budget, and phone are required.");
    error.status = 400;
    throw error;
  }

  return {
    name,
    city,
    area: body.area || "",
    collegeOrOffice: body.collegeOrOffice || "",
    budget,
    genderPreference: body.genderPreference || "Any",
    moveIn: body.moveIn || "Immediate",
    phone: phone.startsWith("91") ? phone : `91${phone}`,
    note: body.note || "",
    status: "active",
  };
}

router.get("/", async (request, response, next) => {
  try {
    if (isMongoConnected()) {
      const query = { status: "active" };
      if (request.query.city) query.city = new RegExp(request.query.city, "i");
      if (request.query.budgetMax) query.budget = { $lte: Number(request.query.budgetMax) };
      if (request.query.genderPreference && request.query.genderPreference !== "Any") {
        query.genderPreference = request.query.genderPreference;
      }
      const posts = await RoommatePost.find(query).sort({ createdAt: -1 }).lean();
      response.json(posts);
      return;
    }

    response.json(memoryPosts.filter((post) => matches(post, request.query)));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const postInput = normalizePost(request.body);

    if (isMongoConnected()) {
      const post = await RoommatePost.create(postInput);
      response.status(201).json(post);
      return;
    }

    memoryPosts.unshift(postInput);
    response.status(201).json(postInput);
  } catch (error) {
    next(error);
  }
});

export default router;
