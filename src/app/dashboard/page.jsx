import ClientOnly from "@/components/ClientOnly.jsx";
import Dashboard from "@/views/Dashboard.jsx";

export const metadata = {
  title: "User Dashboard",
  description: "View your active inquiries, scheduled property visits, and saved listings on RentPE.",
};

export default function DashboardPage() {
  return (
    <ClientOnly>
      <Dashboard />
    </ClientOnly>
  );
}
