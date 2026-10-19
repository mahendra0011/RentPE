import { rooms as staticRooms } from "@/data/rooms.js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rentpe-e6km.onrender.com";
const API_URL = process.env.VITE_API_URL || "http://localhost:5000";

export default async function sitemap() {
  let rooms = staticRooms;
  try {
    const res = await fetch(`${API_URL}/api/rooms?limit=100`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.rooms && data.rooms.length > 0) {
        rooms = data.rooms;
      }
    }
  } catch {
    // fallback to static rooms
  }

  const roomEntries = rooms.map((room) => ({
    url: `${SITE_URL}/rooms/${room.slug || room.id}`,
    lastModified: room.updatedAt || new Date().toISOString(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const staticEntries = [
    {
      url: SITE_URL,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/find-room`,
      lastModified: new Date().toISOString(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/list-room`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/download-apps`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  return [...staticEntries, ...roomEntries];
}
