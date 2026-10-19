import ClientOnly from "@/components/ClientOnly.jsx";
import ListRoom from "@/views/ListRoom.jsx";

export const metadata = {
  title: "List Your Room & Rent Free",
  description: "Publish your room, flat, or PG on RentPE in 4 easy steps. Zero broker commissions, direct tenant chat, and 360° virtual tours.",
};

export default function ListRoomPage() {
  return (
    <ClientOnly>
      <ListRoom />
    </ClientOnly>
  );
}
