import ClientOnly from "@/components/ClientOnly.jsx";
import Wishlist from "@/views/Wishlist.jsx";

export const metadata = {
  title: "Your Saved Rooms",
  description: "Compare your bookmarked PG stays, flats, and hostels on RentPE.",
};

export default function WishlistPage() {
  return (
    <ClientOnly>
      <Wishlist />
    </ClientOnly>
  );
}
