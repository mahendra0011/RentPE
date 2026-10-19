import ClientOnly from "@/components/ClientOnly.jsx";
import MyListedRooms from "@/views/MyListedRooms.jsx";

export const metadata = {
  title: "My Listed Rooms",
  description: "Manage your published listings, change room availability, edit photos, and update house rules on RentPE.",
};

export default function MyRoomsPage() {
  return (
    <ClientOnly>
      <MyListedRooms />
    </ClientOnly>
  );
}
