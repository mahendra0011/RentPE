import ClientOnly from "@/components/ClientOnly.jsx";
import Auth from "@/views/Auth.jsx";

export const metadata = {
  title: "Forgot Password | RentPE",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <ClientOnly>
      <Auth />
    </ClientOnly>
  );
}
