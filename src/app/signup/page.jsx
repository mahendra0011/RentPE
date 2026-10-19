import ClientOnly from "@/components/ClientOnly.jsx";
import Auth from "@/views/Auth.jsx";

export const metadata = {
  title: "Create Free Account | RentPE",
  description: "Join RentPE today as a room seeker or property owner. Zero brokerage, verified listings, and direct chat.",
};

export default function SignupPage() {
  return (
    <ClientOnly>
      <Auth />
    </ClientOnly>
  );
}
