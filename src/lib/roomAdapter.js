import room1 from "@/assets/room-1.jpg";
import room2 from "@/assets/room-2.jpg";
import room3 from "@/assets/room-3.jpg";

const fallbackImages = [room1, room2, room3];

export function normalizeRoom(room, index = 0) {
  const id = room.id || room.slug || room._id;
  const displayLocation =
    typeof room.location === "string"
      ? room.location
      : room.locationLabel || [room.landmark, room.city].filter(Boolean).join(", ");
  const geoCoordinates =
    room.location && typeof room.location === "object" && Array.isArray(room.location.coordinates)
      ? room.location.coordinates
      : null;
  const [fallbackImage] = rotateImages(index);
  const images = room.images?.length ? room.images : rotateImages(index);
  const areaBadge = room.landmark || displayLocation || room.city || "Location listed";

  return {
    ...room,
    id,
    slug: room.slug || id,
    tag: room.tag || `${room.gender || "Co-ed"} ${room.type || "Room"}`,
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
