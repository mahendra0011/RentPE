import { Router } from "express";
import multer from "multer";

import { uploadBuffer } from "../config/cloudinary.js";
import { isMongoConnected } from "../config/db.js";
import { seedRooms } from "../data/seedRooms.js";
import Room from "../models/Room.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
});

const memoryRooms = [...seedRooms];

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getAuthUser(request) {
  const header = request.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) return null;

  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getOwnerEmail(request) {
  return normalizeEmail(
    getAuthUser(request)?.email || request.body.ownerEmail || request.query.ownerEmail,
  );
}

function requireOwner(request, response) {
  const ownerEmail = getOwnerEmail(request);

  if (!ownerEmail || !ownerEmail.includes("@")) {
    response.status(401).json({ message: "Owner login required." });
    return "";
  }

  return ownerEmail;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseAmenities(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const ignoredKeywordTerms = new Set(["near", "room", "rooms", "pg", "flat", "hostel", "in", "at"]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getKeywordTerms(query) {
  const value = String(query.q || query.query || query.location || query.search || "").trim();

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !ignoredKeywordTerms.has(term));
}

function keywordMatches(room, terms) {
  if (!terms.length) return true;

  const haystack = [
    room.title,
    room.tag,
    room.type,
    room.gender,
    room.description,
    room.address,
    room.city,
    room.landmark,
    room.locationLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.some((term) => haystack.includes(term));
}

function buildRoomFilter(query) {
  const filter = { status: "live" };
  const types = parseList(query.types);
  const genders = parseList(query.genders);
  const amenities = parseList(query.amenities);
  const keywordTerms = getKeywordTerms(query);

  if (query.priceMax) filter.price = { $lte: Number(query.priceMax) };
  if (types.length) filter.type = { $in: types };
  if (genders.length) filter.gender = { $in: genders };
  if (amenities.length) filter.amenities = { $all: amenities };
  if (query.furnishedOnly === "true") filter.furnished = true;
  if (query.availableOnly === "true") filter.availability = "available";
  if (keywordTerms.length) {
    const keywordRegexes = keywordTerms.map((term) => new RegExp(escapeRegExp(term), "i"));
    const fields = [
      "title",
      "tag",
      "type",
      "gender",
      "description",
      "address",
      "city",
      "landmark",
      "locationLabel",
    ];

    filter.$or = keywordRegexes.flatMap((keywordRegex) =>
      fields.map((field) => ({ [field]: keywordRegex })),
    );
  }

  return filter;
}

function memoryMatches(room, query) {
  if (!keywordMatches(room, getKeywordTerms(query))) return false;
  if (query.priceMax && room.price > Number(query.priceMax)) return false;
  if (query.furnishedOnly === "true" && !room.furnished) return false;
  if (query.availableOnly === "true" && room.availability !== "available") return false;

  const types = parseList(query.types);
  const genders = parseList(query.genders);
  const amenities = parseList(query.amenities);

  if (types.length && !types.includes(room.type)) return false;
  if (genders.length && !genders.includes(room.gender)) return false;
  if (amenities.length && !amenities.every((amenity) => room.amenities.includes(amenity))) {
    return false;
  }

  return true;
}

async function normalizeRoom(body, images, ownerEmail = "") {
  const title = String(body.title || "").trim();
  const price = Number(body.price || 0);
  const city = String(body.city || "").trim();
  const address = String(body.address || "").trim();
  const landmark = String(body.landmark || "").trim();
  const ownerName = String(body.ownerName || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");

  if (!title || !price || !city || !address || !ownerName || phone.length < 10) {
    const error = new Error("Title, price, city, address, owner name, and phone are required.");
    error.status = 400;
    throw error;
  }

  const slugBase = slugify(title);
  const locationLabel = [landmark, address, city].filter(Boolean).join(", ");

  return {
    slug: `${slugBase}-${Date.now().toString(36)}`,
    title,
    tag: `${body.gender || "Co-ed"} ${body.type || "PG"}`,
    type: body.type || "PG",
    gender: body.gender || "Co-ed",
    price,
    description: body.description || "",
    amenities: parseAmenities(body.amenities),
    images,
    address,
    city,
    landmark,
    locationLabel,
    localEssentials: [],
    ownerEmail,
    furnished: body.furnished !== "false",
    availability: body.availability || "available",
    status: "live",
    owner: {
      name: ownerName,
      phone: phone.startsWith("91") ? phone : `91${phone}`,
      whatsapp: body.whatsapp !== "false",
      verified: false,
      rating: 0,
      since: String(new Date().getFullYear()),
    },
  };
}

function buildRoomUpdates(body, images, existingRoom) {
  const title = String(body.title || existingRoom.title || "").trim();
  const price = Number(body.price || existingRoom.price || 0);
  const city = String(body.city || existingRoom.city || "").trim();
  const address = String(body.address || existingRoom.address || "").trim();
  const landmark = String(body.landmark ?? existingRoom.landmark ?? "").trim();
  const ownerName = String(body.ownerName || existingRoom.owner?.name || "").trim();
  const phone = String(body.phone || existingRoom.owner?.phone || "").replace(/\D/g, "");

  if (!title || !price || !city || !address || !ownerName || phone.length < 10) {
    const error = new Error("Title, price, city, address, owner name, and phone are required.");
    error.status = 400;
    throw error;
  }

  const type = body.type || existingRoom.type || "PG";
  const gender = body.gender || existingRoom.gender || "Co-ed";
  const locationLabel = [landmark, address, city].filter(Boolean).join(", ");

  return {
    title,
    tag: `${gender} ${type}`,
    type,
    gender,
    price,
    description: body.description ?? existingRoom.description ?? "",
    amenities: body.amenities ? parseAmenities(body.amenities) : existingRoom.amenities || [],
    images: images.length ? images : existingRoom.images || [],
    address,
    city,
    landmark,
    locationLabel,
    furnished:
      body.furnished === undefined ? existingRoom.furnished !== false : body.furnished !== "false",
    availability: body.availability || existingRoom.availability || "available",
    owner: {
      ...existingRoom.owner,
      name: ownerName,
      phone: phone.startsWith("91") ? phone : `91${phone}`,
      whatsapp:
        body.whatsapp === undefined
          ? existingRoom.owner?.whatsapp !== false
          : body.whatsapp !== "false",
    },
  };
}

router.get("/", async (request, response, next) => {
  try {
    const filter = buildRoomFilter(request.query);

    if (isMongoConnected()) {
      const rooms = await Room.find(filter).sort({ createdAt: -1 }).lean();
      response.json(rooms);
      return;
    }

    response.json(memoryRooms.filter((room) => memoryMatches(room, request.query)));
  } catch (error) {
    next(error);
  }
});

router.get("/mine", async (request, response, next) => {
  try {
    const ownerEmail = requireOwner(request, response);
    if (!ownerEmail) return;

    if (isMongoConnected()) {
      const rooms = await Room.find({ ownerEmail }).sort({ updatedAt: -1 }).lean();
      response.json(rooms);
      return;
    }

    response.json(memoryRooms.filter((room) => normalizeEmail(room.ownerEmail) === ownerEmail));
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", async (request, response, next) => {
  try {
    const { slug } = request.params;

    if (isMongoConnected()) {
      const room = await Room.findOne({ slug }).lean();
      if (!room) {
        response.status(404).json({ message: "Room not found" });
        return;
      }
      response.json(room);
      return;
    }

    const room = memoryRooms.find((item) => item.slug === slug);
    if (!room) {
      response.status(404).json({ message: "Room not found" });
      return;
    }
    response.json(room);
  } catch (error) {
    next(error);
  }
});

router.post("/", upload.array("photos", 8), async (request, response, next) => {
  try {
    const ownerEmail = requireOwner(request, response);
    if (!ownerEmail) return;

    const images = (await Promise.all((request.files || []).map(uploadBuffer))).filter(Boolean);
    const roomInput = await normalizeRoom(request.body, images, ownerEmail);

    if (isMongoConnected()) {
      const room = await Room.create(roomInput);
      response.status(201).json(room);
      return;
    }

    memoryRooms.unshift(roomInput);
    response.status(201).json(roomInput);
  } catch (error) {
    next(error);
  }
});

router.patch("/:slug", upload.array("photos", 8), async (request, response, next) => {
  try {
    const ownerEmail = requireOwner(request, response);
    if (!ownerEmail) return;

    const images = (await Promise.all((request.files || []).map(uploadBuffer))).filter(Boolean);

    if (isMongoConnected()) {
      const existingRoom = await Room.findOne({
        slug: request.params.slug,
        ownerEmail,
      }).lean();

      if (!existingRoom) {
        response.status(404).json({ message: "Listing not found for this owner." });
        return;
      }

      const updates = buildRoomUpdates(request.body, images, existingRoom);
      const room = await Room.findOneAndUpdate(
        { slug: request.params.slug, ownerEmail },
        { $set: updates },
        { new: true },
      ).lean();
      response.json(room);
      return;
    }

    const index = memoryRooms.findIndex(
      (room) => room.slug === request.params.slug && normalizeEmail(room.ownerEmail) === ownerEmail,
    );

    if (index === -1) {
      response.status(404).json({ message: "Listing not found for this owner." });
      return;
    }

    const updates = buildRoomUpdates(request.body, images, memoryRooms[index]);
    memoryRooms[index] = { ...memoryRooms[index], ...updates };
    response.json(memoryRooms[index]);
  } catch (error) {
    next(error);
  }
});

router.patch("/:slug/availability", async (request, response, next) => {
  try {
    const availability = request.body.availability === "occupied" ? "occupied" : "available";

    if (isMongoConnected()) {
      const room = await Room.findOneAndUpdate(
        { slug: request.params.slug },
        { availability },
        { new: true },
      ).lean();
      if (!room) {
        response.status(404).json({ message: "Room not found" });
        return;
      }
      response.json(room);
      return;
    }

    const room = memoryRooms.find((item) => item.slug === request.params.slug);
    if (!room) {
      response.status(404).json({ message: "Room not found" });
      return;
    }
    room.availability = availability;
    response.json(room);
  } catch (error) {
    next(error);
  }
});

router.post("/:slug/report", async (request, response, next) => {
  try {
    const reason = request.body.reason || "Possible fake listing";

    if (isMongoConnected()) {
      const room = await Room.findOneAndUpdate(
        { slug: request.params.slug },
        { $inc: { reports: 1 } },
        { new: true },
      ).lean();
      if (!room) {
        response.status(404).json({ message: "Room not found" });
        return;
      }
      response.json({ ok: true, reason, reports: room.reports });
      return;
    }

    const room = memoryRooms.find((item) => item.slug === request.params.slug);
    if (!room) {
      response.status(404).json({ message: "Room not found" });
      return;
    }
    room.reports = (room.reports || 0) + 1;
    response.json({ ok: true, reason, reports: room.reports });
  } catch (error) {
    next(error);
  }
});

export default router;
