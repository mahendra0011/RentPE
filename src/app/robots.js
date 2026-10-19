const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rentpe-e6km.onrender.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/my-rooms", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
