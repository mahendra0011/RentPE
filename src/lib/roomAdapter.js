import { buildUniqueRoomImages } from "@/data/cloudinaryRoomImages.js";
import { getCityOption, getCityStateLabel, getRoomTypeMeta } from "@/lib/listingMeta.js";

export function normalizeRoom(room, index = 0) {
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
    distance: areaBadge,
    distanceKm: 0,
    owner,
    geoCoordinates,
    coords: room.coords,
    availability: room.availability || "available",
    localEssentials: room.localEssentials || [],
  };
}

export function normalizeRooms(rooms = []) {
  return rooms.map((room, index) => normalizeRoom(room, index));
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
