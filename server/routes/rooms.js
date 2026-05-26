import { Router } from "express";
import multer from "multer";

import { uploadBuffer } from "../config/cloudinary.js";
import { isMongoConnected } from "../config/db.js";
import { seedRooms } from "../data/seedRooms.js";
import Room from "../models/Room.js";
import { distanceLabel, geocodeAddress, haversineDistanceMeters } from "../utils/geo.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
});

const memoryRooms = [...seedRooms];

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

function buildRoomFilter(query) {
  const filter = { status: "live" };
  const types = parseList(query.types);
  const genders = parseList(query.genders);
  const amenities = parseList(query.amenities);

  if (query.priceMax) filter.price = { $lte: Number(query.priceMax) };
  if (types.length) filter.type = { $in: types };
  if (genders.length) filter.gender = { $in: genders };
  if (amenities.length) filter.amenities = { $all: amenities };
  if (query.furnishedOnly === "true") filter.furnished = true;
  if (query.availableOnly === "true") filter.availability = "available";

  return filter;
}

function memoryMatches(room, query) {
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

async function normalizeRoom(body, images) {
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

  const geocoded = await geocodeAddress(`${landmark} ${address} ${city}`);
  if (!geocoded) {
    const error = new Error(
      "Location could not be geocoded. Try a known city, landmark, or enable GEOCODER_PROVIDER=nominatim.",
    );
    error.status = 400;
    throw error;
  }

  const slugBase = slugify(title);

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
    locationLabel: geocoded.label,
    location: {
      type: "Point",
      coordinates: geocoded.coordinates,
    },
    nearbyEssentials: [],
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

router.get("/nearby", async (request, response, next) => {
  try {
    const maxDistance = Number(request.query.maxDistance || 5000);
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    const searchText = request.query.query || request.query.q || request.query.city || "Bhopal";
    const origin =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { label: "Selected location", coordinates: [lng, lat] }
        : await geocodeAddress(searchText);

    if (!origin) {
      response.status(400).json({
        message: "Search location not found. Try Bhopal, LNCT, MP Nagar, Arera Colony, or Indore.",
      });
      return;
    }

    if (isMongoConnected()) {
      const filter = buildRoomFilter(request.query);
      const rooms = await Room.find({
        ...filter,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: origin.coordinates,
            },
            $maxDistance: maxDistance,
          },
        },
      })
        .limit(60)
        .lean();

      response.json({ origin, rooms });
      return;
    }

    const rooms = memoryRooms
      .filter((room) => memoryMatches(room, request.query))
      .map((room) => {
        const distanceMeters = haversineDistanceMeters(
          origin.coordinates,
          room.location.coordinates,
        );

        return {
          ...room,
          distanceMeters,
          distance: distanceLabel(distanceMeters),
        };
      })
      .filter((room) => room.distanceMeters <= maxDistance)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    response.json({ origin, rooms });
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
    const images = (await Promise.all((request.files || []).map(uploadBuffer))).filter(Boolean);
    const roomInput = await normalizeRoom(request.body, images);

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
