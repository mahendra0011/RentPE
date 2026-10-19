import ClientOnly from "@/components/ClientOnly.jsx";
import FindRoom from "@/views/FindRoom.jsx";

export const metadata = {
  title: "Find Rooms, PGs & Flats",
  description:
    "Search and compare thousands of verified PGs, hostels, and flats by budget, amenities, live distance, and room type with interactive maps.",
  openGraph: {
    title: "Find Rooms, PGs & Flats | RentPE",
    description:
      "Search verified PGs and flats with zero brokerage, interactive maps, and 360° virtual tours.",
  },
};

export default function FindRoomPage() {
  return (
    <ClientOnly>
      <FindRoom />
    </ClientOnly>
  );
}
