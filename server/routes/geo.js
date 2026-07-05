import { Router } from "express";
import rateLimit from "express-rate-limit";

import { geocodeRoomAddress, reverseGeocodeCoordinates } from "../services/nominatim.js";

const geoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
const openRouteServiceUrl = "https://api.openrouteservice.org/v2/directions";
const allowedProfiles = new Set(["foot-walking", "driving-car", "cycling-regular"]);

router.get("/geocode", geoLimiter, async (request, response, next) => {
  try {
    const location = await geocodeRoomAddress({
      address: request.query.address,
      city: request.query.city,
      state: request.query.state,
      landmark: request.query.landmark,
    });

    if (!location) {
      response.status(404).json({
        message: "Map coordinates were not found for this address.",
      });
      return;
    }

    response.json({
      location,
      coordinates: location.coordinates,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/reverse", geoLimiter, async (request, response, next) => {
  try {
    const longitude = Number(request.query.longitude ?? request.query.lng);
    const latitude = Number(request.query.latitude ?? request.query.lat);

    if (!isValidCoordinate(longitude, latitude)) {
      response.status(400).json({
        message: "Longitude and latitude are required.",
      });
      return;
    }

    const payload = await reverseGeocodeCoordinates({ longitude, latitude });

    if (!payload?.city) {
      response.status(404).json({
        message: "City was not found for this location.",
      });
      return;
    }

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/directions", geoLimiter, async (request, response, next) => {
  try {
    const start = parseCoordinatePair(request.body.start);
    const end = parseCoordinatePair(request.body.end);
    const profile = allowedProfiles.has(request.body.profile)
      ? request.body.profile
      : "foot-walking";

    if (!start || !end) {
      response.status(400).json({
        message: "Start and end coordinates are required as [longitude, latitude].",
      });
      return;
    }

    if (!process.env.OPENROUTESERVICE_API_KEY) {
      response.status(503).json({
        message: "OpenRouteService API key is not configured.",
      });
      return;
    }

    const routeResponse = await fetch(`${openRouteServiceUrl}/${profile}/geojson`, {
      method: "POST",
      headers: {
        Accept: "application/geo+json",
        Authorization: process.env.OPENROUTESERVICE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates: [start, end] }),
    });
    const payload = await parseRouteResponse(routeResponse);

    if (!routeResponse.ok) {
      const error = new Error(payload?.error?.message || payload?.message || "Route unavailable.");
      error.status = routeResponse.status;
      throw error;
    }

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

function parseCoordinatePair(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;

  const [longitude, latitude] = value.map(Number);

  if (!isValidCoordinate(longitude, latitude)) return null;

  return [longitude, latitude];
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

async function parseRouteResponse(routeResponse) {
  const text = await routeResponse.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export default router;
