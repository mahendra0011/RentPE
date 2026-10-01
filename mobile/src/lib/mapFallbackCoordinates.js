const INDIA_CENTER = [78.9629, 20.5937];

const knownCityCenters = {
  agartala: [91.2868, 23.8315],
  agra: [78.0081, 27.1767],
  ahmedabad: [72.5714, 23.0225],
  aizawl: [92.7176, 23.7271],
  amritsar: [74.8723, 31.634],
  bengaluru: [77.5946, 12.9716],
  bhopal: [77.4126, 23.2599],
  bhubaneswar: [85.8245, 20.2961],
  chandigarh: [76.7794, 30.7333],
  chennai: [80.2707, 13.0827],
  coimbatore: [76.9558, 11.0168],
  cuttack: [85.8793, 20.4625],
  dehradun: [78.0322, 30.3165],
  delhi: [77.1025, 28.7041],
  faridabad: [77.3178, 28.4089],
  gangtok: [88.6065, 27.3314],
  gurugram: [77.0266, 28.4595],
  guwahati: [91.7362, 26.1445],
  gwalior: [78.1828, 26.2183],
  hyderabad: [78.4867, 17.385],
  imphal: [93.9368, 24.817],
  indore: [75.8577, 22.7196],
  itanagar: [93.6053, 27.0844],
  jabalpur: [79.9864, 23.1815],
  jaipur: [75.7873, 26.9124],
  jalandhar: [75.5762, 31.326],
  jammu: [74.857, 32.7266],
  kanpur: [80.3319, 26.4499],
  kochi: [76.2673, 9.9312],
  kolkata: [88.3639, 22.5726],
  lucknow: [80.9462, 26.8467],
  ludhiana: [75.8573, 30.901],
  madurai: [78.1198, 9.9252],
  mangaluru: [74.856, 12.9141],
  mumbai: [72.8777, 19.076],
  mysuru: [76.6394, 12.2958],
  nagpur: [79.0882, 21.1458],
  nashik: [73.7898, 19.9975],
  newdelhi: [77.209, 28.6139],
  noida: [77.391, 28.5355],
  panaji: [73.8278, 15.4909],
  patna: [85.1376, 25.5941],
  portblair: [92.7265, 11.6234],
  prayagraj: [81.8463, 25.4358],
  puducherry: [79.8083, 11.9416],
  pune: [73.8567, 18.5204],
  raipur: [81.6296, 21.2514],
  rajkot: [70.8022, 22.3039],
  ranchi: [85.324, 23.3441],
  shillong: [91.8933, 25.5788],
  shimla: [77.1734, 31.1048],
  siliguri: [88.3953, 26.7271],
  srinagar: [74.7973, 34.0837],
  surat: [72.8311, 21.1702],
  thane: [72.9781, 19.2183],
  thiruvananthapuram: [76.9366, 8.5241],
  udaipur: [73.7125, 24.5854],
  vadodara: [73.1812, 22.3072],
  varanasi: [82.9739, 25.3176],
};

const stateCenters = {
  andamanandnicobarislands: [92.6586, 11.7401],
  andhrapradesh: [80.5158, 15.9129],
  arunachalpradesh: [94.7278, 28.218],
  assam: [92.9376, 26.2006],
  bihar: [85.3131, 25.0961],
  chandigarh: [76.7794, 30.7333],
  chhattisgarh: [81.8661, 21.2787],
  dadraandnagarhavelianddamananddiu: [72.8328, 20.3974],
  delhi: [77.1025, 28.7041],
  goa: [74.124, 15.2993],
  gujarat: [71.1924, 22.2587],
  haryana: [76.0856, 29.0588],
  himachalpradesh: [77.1734, 31.1048],
  jammuandkashmir: [76.5762, 33.7782],
  jharkhand: [85.2799, 23.6102],
  karnataka: [75.7139, 15.3173],
  kerala: [76.2711, 10.8505],
  ladakh: [77.5771, 34.1526],
  lakshadweep: [72.6417, 10.5626],
  madhyapradesh: [78.6569, 22.9734],
  maharashtra: [75.7139, 19.7515],
  manipur: [93.9063, 24.6637],
  meghalaya: [91.3662, 25.467],
  mizoram: [92.9376, 23.1645],
  nagaland: [94.5624, 26.1584],
  odisha: [85.0985, 20.9517],
  puducherry: [79.8083, 11.9416],
  punjab: [75.3412, 31.1471],
  rajasthan: [74.2179, 27.0238],
  sikkim: [88.5122, 27.533],
  tamilnadu: [78.6569, 11.1271],
  telangana: [79.0193, 18.1124],
  tripura: [91.9882, 23.9408],
  uttarakhand: [79.0193, 30.0668],
  uttarpradesh: [80.9462, 26.8467],
  westbengal: [87.855, 22.9868],
};

export function withFallbackRoomCoordinates(rooms, activeRoom) {
  const cityCenters = getObservedCityCenters([activeRoom, ...rooms].filter(Boolean));

  return rooms.map((room) => {
    if (getProvidedCoordinates(room)) return room;

    return {
      ...room,
      geoCoordinates: getFallbackCoordinates(room, cityCenters),
      approximateCoordinates: true,
    };
  });
}

function getObservedCityCenters(rooms) {
  const buckets = new Map();

  rooms.forEach((room) => {
    const cityKey = normalizeKey(room?.city);
    const coordinates = getProvidedCoordinates(room);
    if (!cityKey || !coordinates) return;

    const bucket = buckets.get(cityKey) || { longitude: 0, latitude: 0, count: 0 };
    bucket.longitude += coordinates[0];
    bucket.latitude += coordinates[1];
    bucket.count += 1;
    buckets.set(cityKey, bucket);
  });

  return new Map(
    [...buckets.entries()].map(([cityKey, bucket]) => [
      cityKey,
      [bucket.longitude / bucket.count, bucket.latitude / bucket.count],
    ]),
  );
}

function getFallbackCoordinates(room, cityCenters) {
  const cityKey = normalizeKey(room?.city);
  const cityCenter =
    cityCenters.get(cityKey) || knownCityCenters[cityKey] || getApproximateCityCenter(room);

  return offsetCoordinate(cityCenter, getRoomKey(room), 4.2);
}

function getApproximateCityCenter(room) {
  const stateKey = normalizeKey(room?.state);
  const cityKey = normalizeKey(room?.city);
  const stateCenter = stateCenters[stateKey] || INDIA_CENTER;
  const cityRadiusKm = stateCenters[stateKey] ? 135 : 950;

  if (!cityKey) return stateCenter;

  return offsetCoordinate(stateCenter, `city:${stateKey}:${cityKey}`, cityRadiusKm);
}

function offsetCoordinate(center, key, radiusKm) {
  const [longitude, latitude] = center;
  const angle = hashRatio(`${key}:angle`) * Math.PI * 2;
  const distanceKm = radiusKm * (0.28 + hashRatio(`${key}:distance`) * 0.72);
  const latitudeOffset = (Math.sin(angle) * distanceKm) / 110.574;
  const longitudeScale = 111.32 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.25);
  const longitudeOffset = (Math.cos(angle) * distanceKm) / longitudeScale;

  return [
    Number((longitude + longitudeOffset).toFixed(6)),
    Number((latitude + latitudeOffset).toFixed(6)),
  ];
}

function getProvidedCoordinates(room) {
  if (Array.isArray(room?.geoCoordinates) && room.geoCoordinates.length === 2) {
    const coordinates = room.geoCoordinates.map(Number);
    if (isValidCoordinate(coordinates)) return coordinates;
  }

  if (room?.location?.type === "Point" && Array.isArray(room.location.coordinates)) {
    const coordinates = room.location.coordinates.map(Number);
    if (isValidCoordinate(coordinates)) return coordinates;
  }

  return null;
}

function getRoomKey(room) {
  return String(room?.id || room?.slug || room?.title || room?.address || room?.city || "room");
}

function hashRatio(value) {
  const hash = hashString(value);
  return hash / 0xffffffff;
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isValidCoordinate(coordinate) {
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
