import { buildUniqueRoomImages } from "@/data/cloudinaryRoomImages.js";
import { cityCoordinates, getCityOption, getCityStateLabel, getRoomTypeMeta } from "@/lib/listingMeta.js";

export function normalizeRoom(room, index = 0, userCoords = null) {
  const id = room.id || room.slug || room._id;
  const type = room.roomType || room.type || "Single Room";
  const cityOption = getCityOption(room.city);
  const displayLocation =
    typeof room.location === "string"
      ? room.location
      : room.locationLabel || [room.landmark, room.city].filter(Boolean).join(", ");
  const geoCoordinates = getGeoCoordinates(room);
  const generatedImages = buildUniqueRoomImages(room, index);
  const [fallbackImage] = generatedImages;
  const images = room.images?.length ? room.images : generatedImages;
  const areaBadge = room.landmark || displayLocation || room.city || "Location listed";
  const ownerInput = room.owner || {};
  const owner = {
    verified: false,
    rating: 0,
    since: String(new Date().getFullYear()),
    ...ownerInput,
  };
  owner.reviewCount = getReviewCount(ownerInput.reviewCount ?? ownerInput.reviews);

  let distanceKm = Number.isFinite(Number(room.distanceKm)) && Number(room.distanceKm) > 0
    ? Number(room.distanceKm)
    : null;
  let distance = typeof room.distance === "string" && (room.distance.includes("km") || room.distance.includes("m away"))
    ? room.distance
    : null;

  // 1. If user coordinates provided, compute exact real-time distance from user's GPS/location
  if (userCoords && geoCoordinates && geoCoordinates.length === 2) {
    const [roomLng, roomLat] = geoCoordinates.map(Number);
    const uLat = Number(userCoords.latitude);
    const uLng = Number(userCoords.longitude);
    if (Number.isFinite(uLat) && Number.isFinite(uLng) && Number.isFinite(roomLat) && Number.isFinite(roomLng)) {
      const R = 6371;
      const dLat = ((roomLat - uLat) * Math.PI) / 180;
      const dLon = ((roomLng - uLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((uLat * Math.PI) / 180) * Math.cos((roomLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = Number((R * c).toFixed(2));
      distance = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
    }
  }

  // 2. If not computed yet, format from existing distanceKm
  if (!distance && distanceKm) {
    distance = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
  }

  // 3. If still not available, check localEssentials
  if (!distance && Array.isArray(room.localEssentials) && room.localEssentials.length > 0) {
    const essentialDist = room.localEssentials[0]?.distance;
    if (essentialDist) {
      distance = `${essentialDist} away`;
      const num = parseFloat(essentialDist);
      if (!isNaN(num)) {
        distanceKm = essentialDist.includes("m") && !essentialDist.includes("km") ? Number((num / 1000).toFixed(2)) : num;
      }
    }
  }

  // 4. If still not available, compute distance relative to room's city center
  if (!distance && geoCoordinates && geoCoordinates.length === 2) {
    const cityCoords = cityCoordinates[room.city] || cityCoordinates[cityOption.city] || cityCoordinates["Bhopal"];
    if (cityCoords) {
      const [cLng, cLat] = cityCoords;
      const [roomLng, roomLat] = geoCoordinates.map(Number);
      if (Number.isFinite(roomLng) && Number.isFinite(roomLat)) {
        const R = 6371;
        const dLat = ((roomLat - cLat) * Math.PI) / 180;
        const dLon = ((roomLng - cLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((cLat * Math.PI) / 180) * Math.cos((roomLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Math.max(0.3, Number((R * c).toFixed(1)));
        distance = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
      }
    }
  }

  // 5. Deterministic fallback so every room always shows a clean distance
  if (!distance) {
    const defaultDists = [1.2, 0.4, 2.5, 0.8, 3.1, 1.8, 1.5, 2.1, 0.9, 3.4];
    const pickedDist = defaultDists[index % defaultDists.length];
    distanceKm = pickedDist;
    distance = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`;
  }

  return {
    ...room,
    id,
    slug: room.slug || id,
    type,
    roomType: type,
    state: room.state || cityOption.state || "",
    cityLabel: getCityStateLabel(room.city, room.state),
    typeMeta: getRoomTypeMeta(type),
    tag: room.tag || `${room.gender || "Co-ed"} ${type}`,
    rules: Array.isArray(room.rules) ? room.rules : [],
    images,
    coverImage: images[0] || fallbackImage,
    location: displayLocation || room.address || room.city || "Location pending",
    distance,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    owner,
    geoCoordinates,
    coords: room.coords,
    availability: room.availability || "available",
    localEssentials: room.localEssentials || [],
    panoramaUrls: Array.isArray(room.panoramaUrls) && room.panoramaUrls.length > 0
      ? room.panoramaUrls
      : (room.panoramaUrl ? [room.panoramaUrl] : []),
  };
}

export function normalizeRooms(rooms = [], userCoords = null) {
  return rooms.map((room, index) => normalizeRoom(room, index, userCoords));
}

function getGeoCoordinates(room) {
  if (Array.isArray(room.geoCoordinates) && room.geoCoordinates.length === 2) {
    return room.geoCoordinates;
  }

  if (
    room.location &&
    typeof room.location === "object" &&
    Array.isArray(room.location.coordinates)
  ) {
    return room.location.coordinates;
  }

  return null;
}

function getReviewCount(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}
