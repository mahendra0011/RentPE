import ClientOnly from "@/components/ClientOnly.jsx";
import NotFound from "@/views/NotFound.jsx";

export const metadata = {
  title: "Page Not Found | RentPE",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
  return (
    <ClientOnly>
      <NotFound />
    </ClientOnly>
  );
}
