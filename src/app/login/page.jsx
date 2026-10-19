import ClientOnly from "@/components/ClientOnly.jsx";
import Auth from "@/views/Auth.jsx";

export const metadata = {
  title: "Login to RentPE",
  description: "Sign in to your RentPE account to manage room listings, chat with owners, or track property visits.",
};

export default function LoginPage() {
  return (
    <ClientOnly>
      <Auth />
    </ClientOnly>
  );
}
