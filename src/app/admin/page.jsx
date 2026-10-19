import ClientOnly from "@/components/ClientOnly.jsx";
import AdminDashboard from "@/views/AdminDashboard.jsx";

export const metadata = {
  title: "Admin Control Center",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <ClientOnly>
      <AdminDashboard />
    </ClientOnly>
  );
}
