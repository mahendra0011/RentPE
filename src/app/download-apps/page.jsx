import ClientOnly from "@/components/ClientOnly.jsx";
import DownloadApps from "@/views/DownloadApps.jsx";

export const metadata = {
  title: "Download RentPE Android APK",
  description: "Download the official RentPE Android APK for broker-free room search, live distance calculator, and 360° virtual tours.",
};

export default function DownloadAppsPage() {
  return (
    <ClientOnly>
      <DownloadApps />
    </ClientOnly>
  );
}
