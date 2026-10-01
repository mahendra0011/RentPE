import { useCallback, useEffect, useState } from "react";
import { cityCoordinates } from "@/lib/listingMeta.js";

const STORAGE_KEY = "roomsfind_user_coords";

/**
 * Haversine formula to compute spherical distance between two points in km.
 */
export function calculateHaversine(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
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
 * Format distance into human-friendly representation: e.g. "450 m away" or "2.3 km away"
 */
export function formatDistanceText(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return "";
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export function getCityCoordinates(cityName = "") {
  if (!cityName) return null;
  const clean = String(cityName).trim().toLowerCase();
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (city.toLowerCase() === clean) {
      return { latitude: coords[1], longitude: coords[0] };
    }
  }
  return null;
}

export function useUserLocation(selectedCity = "") {
  const [coordinates, setCoordinates] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // Ignore localStorage read errors
    }
    const fallback = getCityCoordinates(selectedCity) || { latitude: 23.2599, longitude: 77.4126 };
    return fallback;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGps, setIsGps] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });

  const detectLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
        };
        setCoordinates(coords);
        setIsGps(true);
        setLoading(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
        } catch {
          // Ignore write errors
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Location access denied. Click to retry.");
        const cityCenter = getCityCoordinates(selectedCity) || { latitude: 23.2599, longitude: 77.4126 };
        setCoordinates(cityCenter);
        setIsGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, [selectedCity]);

  // Update center when city selection changes if GPS is not explicitly active
  useEffect(() => {
    if (!isGps) {
      const cityCenter = getCityCoordinates(selectedCity);
      if (cityCenter) {
        setCoordinates(cityCenter);
      }
    }
  }, [isGps, selectedCity]);

  const clearLocation = useCallback(() => {
    setCoordinates(null);
    setIsGps(false);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  const getRoomDistance = useCallback(
    (room) => {
      if (!coordinates) return null;
      let roomLng = null;
      let roomLat = null;

      if (room.location?.coordinates && room.location.coordinates.length === 2) {
        [roomLng, roomLat] = room.location.coordinates;
      } else if (Array.isArray(room.geoCoordinates) && room.geoCoordinates.length === 2) {
        [roomLng, roomLat] = room.geoCoordinates;
      }

      if (!roomLat || !roomLng) return null;

      const dist = calculateHaversine(
        coordinates.latitude,
        coordinates.longitude,
        Number(roomLat),
        Number(roomLng),
      );
      return dist;
    },
    [coordinates],
  );

  return {
    coordinates,
    loading,
    error,
    isGps,
    detectLocation,
    clearLocation,
    getRoomDistance,
  };
}
