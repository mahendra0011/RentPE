async function test() {
  const urls = [
    "http://localhost:3005/",
    "http://localhost:3005/robots.txt",
    "http://localhost:3005/sitemap.xml",
    "http://localhost:3005/rooms/skyline-stay",
    "http://localhost:3005/api/rooms",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`\n=== URL: ${url} (Status: ${res.status}) ===`);
      if (url.includes("robots")) {
        console.log(text.trim());
      } else if (url.includes("sitemap")) {
        console.log(text.slice(0, 300) + "...");
      } else if (url.includes("/rooms/")) {
        const titleMatch = text.match(/<title>([^<]*)<\/title>/);
        const metaDescMatch = text.match(/<meta name="description" content="([^"]*)"/);
        const hasJsonLd = text.includes("application/ld+json");
        const hasSchema = text.includes("RealEstateListing");
        console.log("Title:", titleMatch ? titleMatch[1] : "Not found");
        console.log("Description:", metaDescMatch ? metaDescMatch[1] : "Not found");
        console.log("JSON-LD Included?:", hasJsonLd);
        console.log("Schema Type RealEstateListing?:", hasSchema);
      } else if (url.endsWith("/")) {
        const titleMatch = text.match(/<title>([^<]*)<\/title>/);
        console.log("Home Title:", titleMatch ? titleMatch[1] : "Not found");
      } else if (url.includes("/api/")) {
        console.log("API JSON response length:", text.length, "bytes");
      }
    } catch (err) {
      console.error(`Error on ${url}:`, err.message);
    }
  }
}

test();
