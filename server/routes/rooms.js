import { getAuthUser } from "../middleware/auth.js";
import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";

import { uploadBuffer } from "../config/cloudinary.js";
import { isMongoConnected } from "../config/db.js";
import { seedRooms } from "../data/seedRooms.js";
import Room from "../models/Room.js";
import { geocodeRoomAddress } from "../services/nominatim.js";
import { buildUniqueRoomImages } from "../../src/data/cloudinaryRoomImages.js";

const router = Router();

const roomMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

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

function getOwnerEmail(request) {
  const user = getAuthUser(request);
  return user?.email ? normalizeEmail(user.email) : "";
}

function requireOwner(request, response) {
  const user = getAuthUser(request);

  if (!user?.email) {
    response.status(401).json({ message: "Authentication required." });
    return "";
  }

  if (user.role !== "owner" && user.role !== "admin") {
    response.status(403).json({ message: "Owner access required." });
    return "";
  }

  return normalizeEmail(user.email);
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

function getFallbackRoomImages(room = {}, index = null) {
  return buildUniqueRoomImages(room, index);
}

function withCloudinaryImages(room, index = 0) {
  if (room?.images?.length) return room;

  return {
    ...room,
    images: getFallbackRoomImages(room, index),
  };
}

function withCloudinaryImagesList(rooms = []) {
  return rooms.map((room, index) => withCloudinaryImages(room, index));
}

function parseRules(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall through to plain text parsing.
  }

  return String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getQueryPoint(query) {
  const longitude = parseFiniteNumber(query.lng ?? query.longitude);
  const latitude = parseFiniteNumber(query.lat ?? query.latitude);

  if (!isValidCoordinate(longitude, latitude)) return null;

  return {
    longitude,
    latitude,
    radiusMeters: getRadiusMeters(query),
  };
}

function getRadiusMeters(query) {
  const radiusMeters = parseFiniteNumber(query.radiusMeters);
  if (radiusMeters && radiusMeters > 0) return Math.min(radiusMeters, 100000);

  const radiusKm = parseFiniteNumber(query.radiusKm ?? query.radius);
  if (radiusKm && radiusKm > 0) return Math.min(radiusKm * 1000, 100000);

  return 10000;
}

const ignoredKeywordTerms = new Set([
  "near",
  "room",
  "rooms",
  "single",
  "shared",
  "pg",
  "flat",
  "hostel",
  "in",
  "at",
]);

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
    ...(room.rules || []),
    room.address,
    room.city,
    room.state,
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
  const types = parseList(query.types || query.type || query.roomType);
  const genders = parseList(query.genders);
  const amenities = parseList(query.amenities);
  const keywordTerms = getKeywordTerms(query);
  const queryPoint = getQueryPoint(query);

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
      "rules",
      "address",
      "city",
      "state",
      "landmark",
      "locationLabel",
    ];

    filter.$or = keywordRegexes.flatMap((keywordRegex) =>
      fields.map((field) => ({ [field]: keywordRegex })),
    );
  }
  if (query.city) filter.city = new RegExp(`^${escapeRegExp(query.city)}$`, "i");
  if (query.state) filter.state = new RegExp(`^${escapeRegExp(query.state)}$`, "i");
  if (queryPoint) {
    filter.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [queryPoint.longitude, queryPoint.latitude],
        },
        $maxDistance: queryPoint.radiusMeters,
      },
    };
  }

  return filter;
}

function memoryMatches(room, query) {
  const queryPoint = getQueryPoint(query);

  if (!keywordMatches(room, getKeywordTerms(query))) return false;
  if (query.priceMax && room.price > Number(query.priceMax)) return false;
  if (query.furnishedOnly === "true" && !room.furnished) return false;
  if (query.availableOnly === "true" && room.availability !== "available") return false;
  if (query.city && String(room.city || "").toLowerCase() !== String(query.city).toLowerCase()) {
    return false;
  }
  if (query.state && String(room.state || "").toLowerCase() !== String(query.state).toLowerCase()) {
    return false;
  }

  const types = parseList(query.types || query.type || query.roomType);
  const genders = parseList(query.genders);
  const amenities = parseList(query.amenities);

  if (types.length && !types.includes(room.type)) return false;
  if (genders.length && !genders.includes(room.gender)) return false;
  if (amenities.length && !amenities.every((amenity) => room.amenities.includes(amenity))) {
    return false;
  }
  if (queryPoint && !isRoomWithinRadius(room, queryPoint)) return false;

  return true;
}

function isRoomWithinRadius(room, queryPoint) {
  const coordinates = getRoomCoordinates(room);
  if (!coordinates) return false;

  return (
    getDistanceMeters(
      queryPoint.latitude,
      queryPoint.longitude,
      coordinates.latitude,
      coordinates.longitude,
    ) <= queryPoint.radiusMeters
  );
}

function getRoomCoordinates(room) {
  if (room.location?.type === "Point" && Array.isArray(room.location.coordinates)) {
    const [longitude, latitude] = room.location.coordinates.map(Number);
    if (isValidCoordinate(longitude, latitude)) return { longitude, latitude };
  }

  return null;
}

function getDistanceMeters(firstLatitude, firstLongitude, secondLatitude, secondLongitude) {
  const earthRadiusMeters = 6371000;
  const firstLatRad = toRadians(firstLatitude);
  const secondLatRad = toRadians(secondLatitude);
  const deltaLat = toRadians(secondLatitude - firstLatitude);
  const deltaLng = toRadians(secondLongitude - firstLongitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(firstLatRad) * Math.cos(secondLatRad) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function isValidCoordinate(longitude, latitude) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

async function getRoomLocation(input, fallbackLocation) {
  const longitude = parseFiniteNumber(input.lng ?? input.longitude);
  const latitude = parseFiniteNumber(input.lat ?? input.latitude);

  if (isValidCoordinate(longitude, latitude)) {
    return { type: "Point", coordinates: [longitude, latitude] };
  }

  try {
    return (
      (await geocodeRoomAddress({
        address: input.address,
        city: input.city,
        state: input.state,
        landmark: input.landmark,
      })) || fallbackLocation
    );
  } catch {
    return fallbackLocation || undefined;
  }
}

async function normalizeRoom(body, images, ownerEmail = "") {
  const title = String(body.title || "").trim();
  const price = Number(body.price || 0);
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim();
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
  const slug = `${slugBase}-${Date.now().toString(36)}`;
  const type = body.roomType || body.type || "Single Room";
  const locationLabel = [landmark, address, city].filter(Boolean).join(", ");
  const location = await getRoomLocation({ ...body, address, city, state, landmark });
  const roomImages = images.length ? images : getFallbackRoomImages({ slug });

  return {
    slug,
    title,
    tag: `${body.gender || "Co-ed"} ${type}`,
    type,
    gender: body.gender || "Co-ed",
    price,
    description: body.description || "",
    rules: parseRules(body.rules),
    amenities: parseAmenities(body.amenities),
    images: roomImages,
    address,
    city,
    state,
    landmark,
    locationLabel,
    location,
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
      reviewCount: 0,
      since: String(new Date().getFullYear()),
    },
  };
}

async function buildRoomUpdates(body, images, existingRoom) {
  const title = String(body.title || existingRoom.title || "").trim();
  const price = Number(body.price || existingRoom.price || 0);
  const city = String(body.city || existingRoom.city || "").trim();
  const state = String(body.state ?? existingRoom.state ?? "").trim();
  const address = String(body.address || existingRoom.address || "").trim();
  const landmark = String(body.landmark ?? existingRoom.landmark ?? "").trim();
  const ownerName = String(body.ownerName || existingRoom.owner?.name || "").trim();
  const phone = String(body.phone || existingRoom.owner?.phone || "").replace(/\D/g, "");

  if (!title || !price || !city || !address || !ownerName || phone.length < 10) {
    const error = new Error("Title, price, city, address, owner name, and phone are required.");
    error.status = 400;
    throw error;
  }

  const type = body.roomType || body.type || existingRoom.type || "Single Room";
  const gender = body.gender || existingRoom.gender || "Co-ed";
  const locationLabel = [landmark, address, city].filter(Boolean).join(", ");
  const shouldRefreshLocation =
    body.lat !== undefined ||
    body.latitude !== undefined ||
    body.lng !== undefined ||
    body.longitude !== undefined ||
    !existingRoom.location ||
    address !== (existingRoom.address || "") ||
    city !== (existingRoom.city || "") ||
    state !== (existingRoom.state || "") ||
    landmark !== (existingRoom.landmark || "");
  const location = shouldRefreshLocation
    ? await getRoomLocation({ ...body, address, city, state, landmark }, existingRoom.location)
    : existingRoom.location;

  return {
    title,
    tag: `${gender} ${type}`,
    type,
    gender,
    price,
    description: body.description ?? existingRoom.description ?? "",
    rules: body.rules === undefined ? existingRoom.rules || [] : parseRules(body.rules),
    amenities: body.amenities ? parseAmenities(body.amenities) : existingRoom.amenities || [],
    images: images.length
      ? images
      : existingRoom.images?.length
        ? existingRoom.images
        : getFallbackRoomImages(existingRoom),
    address,
    city,
    state,
    landmark,
    locationLabel,
    location,
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
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (isMongoConnected()) {
      const queryPoint = getQueryPoint(request.query);
      let query = Room.find(filter);
      if (!queryPoint) query = query.sort({ createdAt: -1 });
      const total = await Room.countDocuments(filter);
      const rooms = await query.skip(skip).limit(limit).lean();
      response.json({
        rooms: withCloudinaryImagesList(rooms),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
      return;
    }

    const allRooms = withCloudinaryImagesList(
      memoryRooms.filter((room) => memoryMatches(room, request.query)),
    );
    response.json({
      rooms: allRooms.slice(skip, skip + limit),
      page,
      limit,
      total: allRooms.length,
      totalPages: Math.ceil(allRooms.length / limit),
    });
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
      response.json(withCloudinaryImagesList(rooms));
      return;
    }

    response.json(
      withCloudinaryImagesList(
        memoryRooms.filter((room) => normalizeEmail(room.ownerEmail) === ownerEmail),
      ),
    );
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
      response.json(withCloudinaryImages(room));
      return;
    }

    const room = memoryRooms.find((item) => item.slug === slug);
    if (!room) {
      response.status(404).json({ message: "Room not found" });
      return;
    }
    response.json(withCloudinaryImages(room));
  } catch (error) {
    next(error);
  }
});

router.post("/", roomMutationLimiter, upload.array("photos", 8), async (request, response, next) => {
  try {
    const ownerEmail = requireOwner(request, response);
    if (!ownerEmail) return;

    const images = (await Promise.all((request.files || []).map(uploadBuffer))).filter(Boolean);
    const roomInput = await normalizeRoom(request.body, images, ownerEmail);

    if (isMongoConnected()) {
      const room = await Room.create(roomInput);
      response.status(201).json(withCloudinaryImages(room));
      return;
    }

    memoryRooms.unshift(roomInput);
    response.status(201).json(withCloudinaryImages(roomInput));
  } catch (error) {
    next(error);
  }
});

router.patch("/:slug", roomMutationLimiter, upload.array("photos", 8), async (request, response, next) => {
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

      const updates = await buildRoomUpdates(request.body, images, existingRoom);
      const version = request.body.__v;
      const query = { slug: request.params.slug, ownerEmail };
      if (version !== undefined) {
        query.__v = version;
      }
      const room = await Room.findOneAndUpdate(
        query,
        { $set: updates, $inc: { __v: 1 } },
        { new: true },
      ).lean();
      if (!room) {
        response.status(409).json({ message: "Room was modified by another request. Please refresh and try again." });
        return;
      }
      response.json(withCloudinaryImages(room));
      return;
    }

    const index = memoryRooms.findIndex(
      (room) => room.slug === request.params.slug && normalizeEmail(room.ownerEmail) === ownerEmail,
    );

    if (index === -1) {
      response.status(404).json({ message: "Listing not found for this owner." });
      return;
    }

    const updates = await buildRoomUpdates(request.body, images, memoryRooms[index]);
    memoryRooms[index] = { ...memoryRooms[index], ...updates };
    response.json(withCloudinaryImages(memoryRooms[index]));
  } catch (error) {
    next(error);
  }
});

router.delete("/:slug", roomMutationLimiter, async (request, response, next) => {
  try {
    const ownerEmail = requireOwner(request, response);
    if (!ownerEmail) return;

    if (isMongoConnected()) {
      const room = await Room.findOneAndDelete({
        slug: request.params.slug,
        ownerEmail,
      }).lean();

      if (!room) {
        response.status(404).json({ message: "Listing not found for this owner." });
        return;
      }

      response.json({ ok: true, slug: room.slug });
      return;
    }

    const index = memoryRooms.findIndex(
      (room) => room.slug === request.params.slug && normalizeEmail(room.ownerEmail) === ownerEmail,
    );

    if (index === -1) {
      response.status(404).json({ message: "Listing not found for this owner." });
      return;
    }

    const [room] = memoryRooms.splice(index, 1);
    response.json({ ok: true, slug: room.slug });
  } catch (error) {
    next(error);
  }
});

router.patch("/:slug/availability", roomMutationLimiter, async (request, response, next) => {
  try {
    const ownerEmail = requireOwner(request, response);
    if (!ownerEmail) return;

    const availability = request.body.availability === "occupied" ? "occupied" : "available";

    if (isMongoConnected()) {
      const room = await Room.findOneAndUpdate(
        { slug: request.params.slug, ownerEmail },
        { availability },
        { new: true },
      ).lean();
      if (!room) {
        response.status(404).json({ message: "Room not found or access denied" });
        return;
      }
      response.json(room);
      return;
    }

    const room = memoryRooms.find(
      (item) => item.slug === request.params.slug && normalizeEmail(item.ownerEmail) === ownerEmail,
    );
    if (!room) {
      response.status(404).json({ message: "Room not found or access denied" });
      return;
    }
    room.availability = availability;
    response.json(room);
  } catch (error) {
    next(error);
  }
});

router.post("/:slug/report", roomMutationLimiter, async (request, response, next) => {
  try {
    const user = getAuthUser(request);
    if (!user?.email) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }
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

let io;
export function setSocketIO(socketIO) {
  io = socketIO;
}

export default router;
