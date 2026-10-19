import ClientOnly from "@/components/ClientOnly.jsx";
import Auth from "@/views/Auth.jsx";

export const metadata = {
  title: "Reset Password | RentPE",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <ClientOnly>
      <Auth />
    </ClientOnly>
  );
}
