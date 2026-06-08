export const osmRasterStyle = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster-layer",
      type: "raster",
      source: "osm-raster",
    },
  ],
};

export function getMapTilerStyle(apiKey, mapId = "streets-v2") {
  if (!apiKey) return osmRasterStyle;
  return `https://api.maptiler.com/maps/${mapId}/style.json?key=${encodeURIComponent(apiKey)}`;
}
