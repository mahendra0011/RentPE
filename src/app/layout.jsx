import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers.jsx";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rentpe-e6km.onrender.com"),
  title: {
    default: "RentPE | Broker-Free Rooms, PGs, Flats & 360° Virtual Tours",
    template: "%s | RentPE",
  },
  description:
    "Find verified PGs, hostels, flats, and private rooms across India with zero brokerage. Explore immersive 360° virtual tours and chat directly with verified property owners.",
  keywords: [
    "room rental",
    "zero brokerage rooms",
    "PG near me",
    "hostel booking",
    "flat for rent",
    "360 virtual room tour",
    "student accommodation",
    "RentPE",
    "room seekers",
    "property owners",
  ],
  authors: [{ name: "RentPE" }],
  creator: "RentPE",
  publisher: "RentPE",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://rentpe-e6km.onrender.com",
    siteName: "RentPE",
    title: "RentPE — Broker-Free Room Rental & 360° Virtual Tours",
    description:
      "Find verified rooms with zero brokerage, live distance calculation, direct owner chat, and 360° virtual tours.",
    images: [
      {
        url: "/assets/home/hero-bg.png",
        width: 1200,
        height: 630,
        alt: "RentPE Platform Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RentPE — Broker-Free Room Rentals & 360° Virtual Tours",
    description:
      "Find verified PGs, hostels, and flats with interactive 360° virtual tours and direct owner messaging.",
    images: ["/assets/home/hero-bg.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background font-sans text-ink antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
