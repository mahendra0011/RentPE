import room1 from "@/assets/room-1.jpg";
import room2 from "@/assets/room-2.jpg";
import room3 from "@/assets/room-3.jpg";

import { getCityOption, getCityStateLabel, getRoomTypeMeta } from "@/lib/listingMeta.js";

const fallbackImages = [room1, room2, room3];

export function normalizeRoom(room, index = 0) {
  const id = room.id || room.slug || room._id;
  const type = room.roomType || room.type || "Single Room";
  const cityOption = getCityOption(room.city);
  const displayLocation =
    typeof room.location === "string"
      ? room.location
      : room.locationLabel || [room.landmark, room.city].filter(Boolean).join(", ");
  const geoCoordinates = getGeoCoordinates(room);
  const [fallbackImage] = rotateImages(index);
  const images = room.images?.length ? room.images : rotateImages(index);
  const areaBadge = room.landmark || displayLocation || room.city || "Location listed";

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
    owner: {
      verified: false,
      rating: 0,
      since: String(new Date().getFullYear()),
      ...room.owner,
    },
    geoCoordinates,
    coords: room.coords,
    availability: room.availability || "available",
    localEssentials: room.localEssentials || [],
  };
}

export function normalizeRooms(rooms = []) {
  return rooms.map((room, index) => normalizeRoom(room, index));
}

function rotateImages(index) {
  return [
    fallbackImages[index % fallbackImages.length],
    fallbackImages[(index + 1) % fallbackImages.length],
    fallbackImages[(index + 2) % fallbackImages.length],
  ];
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
