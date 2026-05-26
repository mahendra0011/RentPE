const knownPlaces = [
  {
    match: ["lnct", "lnct college"],
    label: "LNCT College, Bhopal",
    coordinates: [77.4924, 23.2515],
  },
  {
    match: ["bhopal railway station", "railway station"],
    label: "Bhopal Railway Station",
    coordinates: [77.4146, 23.2678],
  },
  {
    match: ["mp nagar", "mp nagar zone 2"],
    label: "MP Nagar, Bhopal",
    coordinates: [77.4335, 23.2336],
  },
  {
    match: ["arera colony", "e-8"],
    label: "Arera Colony, Bhopal",
    coordinates: [77.4264, 23.2077],
  },
  {
    match: ["indrapuri"],
    label: "Indrapuri, Bhopal",
    coordinates: [77.4845, 23.2486],
  },
  {
    match: ["kolar road", "kolar"],
    label: "Kolar Road, Bhopal",
    coordinates: [77.4122, 23.1699],
  },
  {
    match: ["habibganj", "rani kamlapati"],
    label: "Rani Kamlapati / Habibganj, Bhopal",
    coordinates: [77.4394, 23.2214],
  },
  {
    match: ["db mall"],
    label: "DB Mall, Bhopal",
    coordinates: [77.4307, 23.2325],
  },
  {
    match: ["bhopal"],
    label: "Bhopal, Madhya Pradesh",
    coordinates: [77.4126, 23.2599],
  },
  {
    match: ["indore"],
    label: "Indore, Madhya Pradesh",
    coordinates: [75.8577, 22.7196],
  },
  {
    match: ["pune"],
    label: "Pune, Maharashtra",
    coordinates: [73.8567, 18.5204],
  },
  {
    match: ["bangalore", "bengaluru"],
    label: "Bengaluru, Karnataka",
    coordinates: [77.5946, 12.9716],
  },
  {
    match: ["delhi", "delhi ncr"],
    label: "Delhi NCR",
    coordinates: [77.209, 28.6139],
  },
];

export function findKnownPlace(query = "") {
  const normalized = query.toLowerCase();
  return knownPlaces.find((place) => place.match.some((term) => normalized.includes(term)));
}

export async function geocodeAddress(query = "") {
  const known = findKnownPlace(query);
  if (known) {
    return known;
  }

  if (process.env.GEOCODER_PROVIDER !== "nominatim") {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "in");

    const response = await fetch(url, {
      headers: {
        "User-Agent": process.env.GEOCODER_USER_AGENT || "RentPE local development",
      },
      signal: controller.signal,
    });
    const results = await response.json();
    const first = results[0];

    if (!first) return null;

    return {
      label: first.display_name,
      coordinates: [Number(first.lon), Number(first.lat)],
    };
  } catch (error) {
    console.warn(`Geocoding failed for "${query}": ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function haversineDistanceMeters(fromCoordinates, toCoordinates) {
  const [fromLng, fromLat] = fromCoordinates;
  const [toLng, toLat] = toCoordinates;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMeters * c);
}

export function distanceLabel(meters) {
  if (meters < 1000) {
    return `${meters} m away`;
  }

  return `${(meters / 1000).toFixed(1)} km away`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
