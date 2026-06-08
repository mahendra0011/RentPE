export const mapTilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY || "";
export const openRouteServiceApiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY || "";

export const defaultMapCenter = [77.4126, 23.2599];

export function getMapTilerStyleUrl(style = "streets-v2") {
  if (!mapTilerApiKey) return "";
  return `https://api.maptiler.com/maps/${style}/style.json?key=${mapTilerApiKey}`;
}

export async function geocodeAddress(query) {
  if (!mapTilerApiKey) {
    throw new Error("MapTiler key missing. Add VITE_MAPTILER_API_KEY.");
  }

  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    throw new Error("Address is required before geocoding.");
  }

  const params = new URLSearchParams({
    key: mapTilerApiKey,
    country: "in",
    limit: "5",
    language: "en",
  });
  const response = await fetch(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmedQuery)}.json?${params}`,
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || "MapTiler geocoding failed.");
  }

  const feature = payload.features?.find((item) => Array.isArray(item.center));

  if (!feature) {
    throw new Error("No coordinates found for this address.");
  }

  return {
    longitude: Number(feature.center[0]),
    latitude: Number(feature.center[1]),
    label: feature.place_name || feature.text || trimmedQuery,
  };
}

export async function getRouteGeoJson({ start, end, profile = "driving-car" }) {
  if (!openRouteServiceApiKey) {
    throw new Error("OpenRouteService key missing. Add VITE_OPENROUTESERVICE_API_KEY.");
  }

  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    throw new Error("Valid start and end coordinates are required.");
  }

  const response = await fetch(
    `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
    {
      method: "POST",
      headers: {
        Authorization: openRouteServiceApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [start, end],
        instructions: false,
      }),
    },
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenRouteService routing failed.");
  }

  return payload;
}

export function getRoomLngLat(room) {
  if (Array.isArray(room.geoCoordinates) && room.geoCoordinates.length === 2) {
    const coordinates = room.geoCoordinates.map(Number);
    if (isValidCoordinate(coordinates)) return coordinates;
  }

  if (room.location?.coordinates?.length === 2) {
    const coordinates = room.location.coordinates.map(Number);
    if (isValidCoordinate(coordinates)) return coordinates;
  }

  return null;
}

export function getRoomsCenter(rooms) {
  const coordinates = rooms.map(getRoomLngLat).filter(Boolean);
  if (!coordinates.length) return defaultMapCenter;

  const longitude =
    coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / coordinates.length;
  const latitude =
    coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length;

  return [longitude, latitude];
}

export function formatCoordinate(value) {
  return Number(value || 0).toFixed(6);
}

export function isValidCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) return false;

  const [longitude, latitude] = coordinate.map(Number);
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export function createRadiusPolygon(center, radiusKm = 3, steps = 96) {
  if (!isValidCoordinate(center)) return null;

  const [longitude, latitude] = center;
  const latitudeRadius = radiusKm / 111.32;
  const longitudeRadius = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));
  const coordinates = [];

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    coordinates.push([
      longitude + Math.cos(angle) * longitudeRadius,
      latitude + Math.sin(angle) * latitudeRadius,
    ]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {},
  };
}
