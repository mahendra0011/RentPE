import { Index } from "flexsearch";

const ignoredSearchTerms = new Set(["near", "room", "rooms", "in", "at", "the", "for"]);

export function createRoomSearchIndex(rooms) {
  const index = new Index({
    cache: true,
    resolution: 9,
    tokenize: "forward",
  });

  rooms.forEach((room) => {
    index.add(String(room.id), buildSearchText(room));
  });

  return index;
}

export function searchRoomIds(index, query, limit) {
  const searchQuery = normalizeSearchQuery(query);
  if (!searchQuery) return null;

  return index.search(searchQuery, {
    limit,
  });
}

function normalizeSearchQuery(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !ignoredSearchTerms.has(term))
    .join(" ");
}

function buildSearchText(room) {
  return [
    room.title,
    room.tag,
    room.type,
    room.gender,
    room.description,
    room.address,
    room.city,
    room.landmark,
    room.location,
    room.locationLabel,
    ...(room.amenities || []),
    ...(room.localEssentials || []).map((item) => item.name),
  ]
    .filter(Boolean)
    .join(" ");
}
