import { Router } from "express";

import { isMongoConnected } from "../config/db.js";
import { seedRoommates } from "../data/seedRoommates.js";
import RoommatePost from "../models/RoommatePost.js";

const router = Router();
const memoryPosts = [...seedRoommates];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getSearchTerms(query) {
  return String(query.q || query.search || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

function keywordMatches(post, terms) {
  if (!terms.length) return true;

  const haystack = [
    post.name,
    post.occupation,
    post.city,
    post.area,
    post.collegeOrOffice,
    post.roomType,
    post.genderPreference,
    post.moveIn,
    post.lifestyle,
    post.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.some((term) => haystack.includes(term));
}

function matches(post, query) {
  if (!keywordMatches(post, getSearchTerms(query))) return false;
  if (query.city && !post.city.toLowerCase().includes(String(query.city).toLowerCase())) {
    return false;
  }
  if (query.area && !post.area.toLowerCase().includes(String(query.area).toLowerCase())) {
    return false;
  }
  if (query.budgetMax && post.budget > Number(query.budgetMax)) return false;
  if (query.roomType && query.roomType !== "Any" && post.roomType !== query.roomType) {
    return false;
  }
  if (
    query.genderPreference &&
    query.genderPreference !== "Any" &&
    post.genderPreference !== query.genderPreference
  ) {
    return false;
  }
  return post.status === "active";
}

function buildMongoQuery(query) {
  const mongoQuery = { status: "active" };
  const terms = getSearchTerms(query);

  if (query.city) mongoQuery.city = new RegExp(query.city, "i");
  if (query.area) mongoQuery.area = new RegExp(query.area, "i");
  if (query.budgetMax) mongoQuery.budget = { $lte: Number(query.budgetMax) };
  if (query.roomType && query.roomType !== "Any") mongoQuery.roomType = query.roomType;
  if (query.genderPreference && query.genderPreference !== "Any") {
    mongoQuery.genderPreference = query.genderPreference;
  }

  if (terms.length) {
    const fields = [
      "name",
      "occupation",
      "city",
      "area",
      "collegeOrOffice",
      "roomType",
      "genderPreference",
      "moveIn",
      "lifestyle",
      "note",
    ];

    mongoQuery.$or = terms.flatMap((term) => {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      return fields.map((field) => ({ [field]: regex }));
    });
  }

  return mongoQuery;
}

function normalizePost(body) {
  const name = String(body.name || "").trim();
  const city = String(body.city || "").trim();
  const area = String(body.area || "").trim();
  const collegeOrOffice = String(body.collegeOrOffice || "").trim();
  const budget = Number(body.budget || 0);
  const phone = String(body.phone || "").replace(/\D/g, "");

  if (!name || !city || !budget || phone.length < 10) {
    const error = new Error("Name, city, budget, and phone are required.");
    error.status = 400;
    throw error;
  }

  return {
    slug: `${slugify(`${name} ${area || city}`)}-${Date.now().toString(36)}`,
    name,
    occupation: body.occupation || "Student",
    city,
    area,
    collegeOrOffice,
    budget,
    roomType: body.roomType || "Any",
    genderPreference: body.genderPreference || "Any",
    moveIn: body.moveIn || "Immediate",
    lifestyle: body.lifestyle || "No preference",
    phone: phone.startsWith("91") ? phone : `91${phone}`,
    note: body.note || "",
    status: "active",
  };
}

router.get("/", async (request, response, next) => {
  try {
    if (isMongoConnected()) {
      const query = buildMongoQuery(request.query);
      const posts = await RoommatePost.find(query).sort({ createdAt: -1 }).lean();
      response.json(posts);
      return;
    }

    response.json(memoryPosts.filter((post) => matches(post, request.query)));
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (request, response, next) => {
  try {
    const { slug } = request.params;

    if (isMongoConnected()) {
      const post = await RoommatePost.findOne({
        $or: [{ slug }, { _id: /^[a-f\d]{24}$/i.test(slug) ? slug : undefined }].filter(
          (condition) => Object.values(condition)[0],
        ),
      }).lean();

      if (!post) {
        response.status(404).json({ message: "Roommate request not found." });
        return;
      }

      response.json(post);
      return;
    }

    const post = memoryPosts.find((item) => item.slug === slug);
    if (!post) {
      response.status(404).json({ message: "Roommate request not found." });
      return;
    }

    response.json(post);
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
