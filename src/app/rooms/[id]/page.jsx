import ClientOnly from "@/components/ClientOnly.jsx";
import RoomDetails from "@/views/RoomDetails.jsx";
import { getRoom } from "@/data/rooms.js";

const API_URL = process.env.VITE_API_URL || "http://localhost:5000";

async function fetchRoomData(id) {
  try {
    const res = await fetch(`${API_URL}/api/rooms/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      return data.room || data;
    }
  } catch {
    // fallback to static
  }
  return getRoom(id) || null;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const room = await fetchRoomData(id);

  if (!room) {
    return {
      title: "Room Details | RentPE",
      description: "Explore verified room listings on RentPE.",
    };
  }

  const title = `${room.title} in ${room.city || "Top Location"} | RentPE`;
  const description = `Rent this verified property for ₹${room.price || 0}/month in ${room.locationLabel || room.address || room.city || "city"}. Explore photos, house rules, 360° virtual tour, and connect directly with the owner with zero brokerage.`;
  const image = room.images?.[0] || "/assets/home/hero-bg.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, alt: room.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function RoomPage({ params }) {
  const { id } = await params;
  const room = await fetchRoomData(id);

  const jsonLd = room
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: room.title,
        description: room.description || "Room available for rent",
        image: room.images || [],
        offers: {
          "@type": "Offer",
          price: room.price || 0,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: room.address || "",
          addressLocality: room.city || "",
          addressCountry: "IN",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ClientOnly>
        <RoomDetails />
      </ClientOnly>
    </>
  );
}
