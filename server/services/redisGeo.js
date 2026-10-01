import Redis from "ioredis";

const REDIS_GEO_KEY = "rooms:geo";
let isConnected = false;

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 200, 1000);
  },
  enableOfflineQueue: false,
});

redis.on("connect", () => {
  isConnected = true;
  console.log("✅ Redis connected for geospatial room search");
});

redis.on("error", (err) => {
  isConnected = false;
  // Non-fatal warning so app functions normally even if Redis is stopped
  console.warn("⚠️ Redis not reachable, using mathematical fallback:", err.message);
});

redis.on("close", () => {
  isConnected = false;
});

// Try initial connection in background
redis.connect().catch(() => {
  isConnected = false;
});

export function isRedisReady() {
  return isConnected && redis.status === "ready";
}

/**
 * Calculates distance using the Haversine formula (Earth radius: 6371 km).
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Formats distance into a human-readable string: e.g. "450 m away" or "1.8 km away"
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return "";
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Adds or updates a room in the Redis GEO set.
 */
export async function addRoomGeo(roomId, longitude, latitude) {
  if (!isRedisReady()) return false;
  try {
    const lng = Number(longitude);
    const lat = Number(latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;
    await redis.geoadd(REDIS_GEO_KEY, lng, lat, String(roomId));
    return true;
  } catch (err) {
    console.warn("Failed to add room to Redis GEO:", err.message);
    return false;
  }
}

/**
 * Syncs a list of rooms to the Redis GEO set.
 */
export async function syncRoomsGeo(rooms = []) {
  if (!isRedisReady() || !rooms.length) return false;
  try {
    const pipeline = redis.pipeline();
    let count = 0;

    for (const room of rooms) {
      const id = String(room.slug || room.id || room._id);
      let coords = null;

      if (room.location?.coordinates && room.location.coordinates.length === 2) {
        coords = room.location.coordinates;
      } else if (Array.isArray(room.geoCoordinates) && room.geoCoordinates.length === 2) {
        coords = room.geoCoordinates;
      }

      if (coords) {
        const [lng, lat] = coords.map(Number);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          pipeline.geoadd(REDIS_GEO_KEY, lng, lat, id);
          count++;
        }
      }
    }

    if (count > 0) {
      await pipeline.exec();
      console.log(`📍 Synced ${count} rooms into Redis geospatial index`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Failed to sync rooms to Redis GEO:", err.message);
    return false;
  }
}

/**
 * Queries Redis for nearby rooms within radiusKm.
 * Returns a Map of roomId -> distanceKm.
 */
export async function queryNearbyRoomsRedis(longitude, latitude, radiusKm = 50) {
  if (!isRedisReady()) return null;
  try {
    const lng = Number(longitude);
    const lat = Number(latitude);
    const radius = Number(radiusKm) || 50;

    // Use GEORADIUS with WITHDIST (compatible with all Redis versions)
    const results = await redis.georadius(
      REDIS_GEO_KEY,
      lng,
      lat,
      radius,
      "km",
      "WITHDIST",
      "ASC",
    );

    const distanceMap = new Map();
    if (Array.isArray(results)) {
      for (const item of results) {
        if (Array.isArray(item) && item.length >= 2) {
          const [roomId, distStr] = item;
          distanceMap.set(String(roomId), Number(distStr));
        }
      }
    }

    return distanceMap;
  } catch (err) {
    console.warn("Redis GEORADIUS error, falling back to Haversine:", err.message);
    return null;
  }
}

export default redis;
