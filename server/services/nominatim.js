const defaultNominatimUrl = "https://nominatim.openstreetmap.org";

export async function geocodeRoomAddress({ address, city, state, landmark }) {
  const queries = getGeocodeQueries({ address, city, state, landmark });
  if (!queries.length) return null;

  const baseUrl = (process.env.NOMINATIM_BASE_URL || defaultNominatimUrl).replace(/\/$/, "");

  for (const query of queries) {
    const location = await fetchGeocodeQuery(baseUrl, query);
    if (location) return location;
  }

  return null;
}

export async function reverseGeocodeCoordinates({ longitude, latitude }) {
  if (!isValidCoordinate(Number(longitude), Number(latitude))) return null;

  const baseUrl = (process.env.NOMINATIM_BASE_URL || defaultNominatimUrl).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/reverse`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));

  const response = await fetchWithRetry(url, {
    headers: {
      "User-Agent": getNominatimUserAgent(),
      "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
    },
  });

  const result = await response.json();
  const address = result?.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.city_district ||
    address.suburb ||
    address.locality ||
    address.hamlet ||
    address.county ||
    address.district ||
    address.state_district ||
    "";

  return {
    city,
    state: address.state || "",
    address,
    location: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    },
  };
}

async function fetchGeocodeQuery(baseUrl, query) {
  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("q", query);

  const response = await fetchWithRetry(url, {
    headers: {
      "User-Agent": getNominatimUserAgent(),
      "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
    },
  });

  const results = await response.json();
  const [result] = Array.isArray(results) ? results : [];
  if (!result) return null;

  const longitude = Number(result.lon);
  const latitude = Number(result.lat);
  if (!isValidCoordinate(longitude, latitude)) return null;

  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (response.status !== 429 || attempt === maxRetries) {
      throw new Error(`Nominatim geocoding failed with ${response.status}.`);
    }
  }
  throw new Error(`Nominatim geocoding failed with 429 after ${maxRetries} retries.`);
}

function getGeocodeQueries({ address, city, state, landmark }) {
  const queryParts = [
    [landmark, address, city, state, "India"],
    [address, city, state, "India"],
    [landmark, city, state, "India"],
  ];
  const queries = queryParts
    .map((parts) => parts.map(cleanQueryPart).filter(Boolean).join(", "))
    .filter(Boolean);

  return [...new Set(queries)];
}

function cleanQueryPart(value) {
  return String(value || "").trim();
}

function getNominatimUserAgent() {
  const appName = process.env.NOMINATIM_APP_NAME || "RentPE";
  const contactEmail = process.env.NOMINATIM_CONTACT_EMAIL || process.env.BREVO_SENDER_EMAIL || "";

  return contactEmail ? `${appName}/1.0 (${contactEmail})` : `${appName}/1.0`;
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
