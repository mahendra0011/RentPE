import ClientOnly from "@/components/ClientOnly.jsx";
import Home from "@/views/Home.jsx";

export const metadata = {
  title: "RentPE | Broker-Free Rooms, PGs, Flats & 360° Virtual Tours",
  description:
    "Find verified PGs, hostels, flats, and private rooms across India with zero brokerage. Explore immersive 360° virtual tours and chat directly with verified property owners.",
};

export default function HomePage() {
  return (
    <ClientOnly>
      <Home />
    </ClientOnly>
  );
}
