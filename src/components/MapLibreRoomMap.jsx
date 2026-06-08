import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl from "maplibre-gl";
import { LocateFixed, Minus, Plus, Route, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatPrice } from "@/lib/format.js";
import { getRoomTypeMeta, roomTypeMeta } from "@/lib/listingMeta.js";
import {
  createRadiusPolygon,
  getMapTilerStyleUrl,
  getRoomLngLat,
  getRoomsCenter,
  getRouteGeoJson,
  mapTilerApiKey,
  openRouteServiceApiKey,
} from "@/lib/mapServices.js";

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const markerSymbols = {
  "Single Room": "🏠",
  PG: "🏢",
  "Shared Room": "🛏️",
  Flat: "🏘️",
  Hostel: "🛌",
};

export default function MapLibreRoomMap({
  rooms,
  activeRoomId = "",
  onActiveRoomChange,
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const activeRoomRef = useRef("");
  const roomsRef = useRef(rooms);
  const userLocationRef = useRef(null);
  const onActiveRoomChangeRef = useRef(onActiveRoomChange);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [routeStatus, setRouteStatus] = useState("");
  const mapCenter = useMemo(() => getRoomsCenter(rooms), [rooms]);
  const roomFeatures = useMemo(() => buildRoomFeatures(rooms), [rooms]);
  const initialMapCenterRef = useRef(mapCenter);
  const initialRoomCountRef = useRef(rooms.length);
  const initialRoomFeaturesRef = useRef(roomFeatures);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    onActiveRoomChangeRef.current = onActiveRoomChange;
  }, [onActiveRoomChange]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapTilerStyleUrl(),
      center: initialMapCenterRef.current,
      zoom: initialRoomCountRef.current ? 11.4 : 5,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      addMapSources(map, initialRoomFeaturesRef.current);
      addMapLayers(map);
      wireMapEvents(map, {
        onRoomOpen: (roomId, coordinates) => {
          const room = roomsRef.current.find((item) => item.id === roomId);
          if (!room) return;

          onActiveRoomChangeRef.current?.(roomId);
          popupRef.current?.remove();
          popupRef.current = showRoomPopup(map, room, coordinates, {
            userLocation: userLocationRef.current,
            onRoute: () => setRouteStatus("routing"),
          });
        },
      });
      setMapReady(true);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("rooms");
    source?.setData(roomFeatures);

    if (roomFeatures.features.length) {
      const bounds = new maplibregl.LngLatBounds();
      roomFeatures.features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
      map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 550 });
    }
  }, [mapReady, roomFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    updateUserLocation(map, userLocation);
  }, [mapReady, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !activeRoomId) return;

    const room = rooms.find((item) => item.id === activeRoomId);
    const coordinates = room ? getRoomLngLat(room) : null;

    if (!room || !coordinates) return;

    map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 13), duration: 450 });
    popupRef.current?.remove();
    popupRef.current = showRoomPopup(map, room, coordinates, {
      userLocation,
      onRoute: () => setRouteStatus("routing"),
    });
  }, [activeRoomId, mapReady, rooms, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const room = rooms.find((item) => item.id === activeRoomRef.current);
    const roomCoordinates = room ? getRoomLngLat(room) : null;

    if (!map || !mapReady || routeStatus !== "routing" || !userLocation || !roomCoordinates) {
      if (routeStatus === "routing") setRouteStatus("");
      return;
    }

    let cancelled = false;

    async function drawRoute() {
      try {
        const routeGeoJson = await getRouteGeoJson({
          start: userLocation,
          end: roomCoordinates,
          profile: "driving-car",
        });

        if (cancelled) return;
        map.getSource("route")?.setData(routeGeoJson);
        setRouteStatus("ready");
      } catch (routeError) {
        if (!cancelled) setRouteStatus(routeError.message);
      }
    }

    drawRoute();

    return () => {
      cancelled = true;
    };
  }, [mapReady, rooms, routeStatus, userLocation]);

  function locateUser() {
    if (!navigator.geolocation) {
      setRouteStatus("Location is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = [position.coords.longitude, position.coords.latitude];
        setUserLocation(coordinates);
        mapRef.current?.flyTo({ center: coordinates, zoom: 13, duration: 550 });
      },
      () => setRouteStatus("Location permission was not allowed."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <section
      className={`relative min-h-[640px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-sm lg:min-h-[720px] ${className}`}
      aria-label="Room map"
    >
      <div ref={mapContainerRef} className="absolute inset-0" />

      <div className="absolute left-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">MapLibre</p>
        <p className="mt-1 text-sm font-black text-ink">{rooms.length} rooms in this search</p>
      </div>

      <div className="absolute right-4 top-4 z-20 grid gap-2">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={locateUser}
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-brand shadow-sm transition-colors hover:bg-brand-soft"
          aria-label="Use current location"
          title="Use current location"
        >
          <LocateFixed className="size-4" />
        </button>
      </div>

      {!mapTilerApiKey && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 p-6 text-center backdrop-blur">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Search className="mx-auto mb-3 size-7 text-brand" />
            <p className="font-black text-ink">MapTiler key required</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              Add VITE_MAPTILER_API_KEY to show the live MapLibre map.
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        {Object.values(roomTypeMeta).map((meta) => (
          <span
            key={meta.label}
            className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-600"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>

      {routeStatus && routeStatus !== "ready" && (
        <div className="absolute bottom-4 right-4 z-20 max-w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-3 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
          <Route className="mr-1 inline size-3.5 text-brand" />
          {routeStatus === "routing" ? "Calculating route..." : routeStatus}
        </div>
      )}

      {!openRouteServiceApiKey && (
        <div className="absolute bottom-20 right-4 z-20 max-w-[260px] rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800 shadow-sm">
          Add VITE_OPENROUTESERVICE_API_KEY for route lines.
        </div>
      )}
    </section>
  );
}

function buildRoomFeatures(rooms) {
  return {
    type: "FeatureCollection",
    features: rooms
      .map((room) => {
        const coordinates = getRoomLngLat(room);
        const meta = getRoomTypeMeta(room.type);

        if (!coordinates) return null;

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates },
          properties: {
            roomId: room.id,
            title: room.title,
            type: meta.label,
            marker: markerSymbols[meta.label] || "🏠",
            color: meta.color,
          },
        };
      })
      .filter(Boolean),
  };
}

function addMapSources(map, roomFeatures) {
  map.addSource("rooms", {
    type: "geojson",
    data: roomFeatures,
    cluster: true,
    clusterRadius: 54,
    clusterMaxZoom: 14,
  });
  map.addSource("user-location", {
    type: "geojson",
    data: emptyFeatureCollection,
  });
  map.addSource("search-radius", {
    type: "geojson",
    data: emptyFeatureCollection,
  });
  map.addSource("route", {
    type: "geojson",
    data: emptyFeatureCollection,
  });
}

function addMapLayers(map) {
  map.addLayer({
    id: "search-radius-fill",
    type: "fill",
    source: "search-radius",
    paint: {
      "fill-color": "#7c3aed",
      "fill-opacity": 0.08,
    },
  });
  map.addLayer({
    id: "search-radius-line",
    type: "line",
    source: "search-radius",
    paint: {
      "line-color": "#7c3aed",
      "line-opacity": 0.4,
      "line-width": 2,
      "line-dasharray": [2, 2],
    },
  });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    paint: {
      "line-color": "#16a34a",
      "line-width": 4,
      "line-opacity": 0.88,
    },
  });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "rooms",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#111827",
      "circle-radius": ["step", ["get", "point_count"], 20, 25, 26, 100, 32],
      "circle-stroke-width": 4,
      "circle-stroke-color": "#ffffff",
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "rooms",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 13,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    },
    paint: {
      "text-color": "#ffffff",
    },
  });
  map.addLayer({
    id: "room-markers",
    type: "circle",
    source: "rooms",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 20,
      "circle-stroke-width": 4,
      "circle-stroke-color": "#ffffff",
    },
  });
  map.addLayer({
    id: "room-marker-icons",
    type: "symbol",
    source: "rooms",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "marker"],
      "text-size": 17,
      "text-allow-overlap": true,
    },
  });
  map.addLayer({
    id: "user-location-dot",
    type: "circle",
    source: "user-location",
    paint: {
      "circle-color": "#111827",
      "circle-radius": 9,
      "circle-stroke-width": 5,
      "circle-stroke-color": "#ffffff",
    },
  });
}

function wireMapEvents(map, { onRoomOpen }) {
  map.on("click", "clusters", async (event) => {
    const feature = map.queryRenderedFeatures(event.point, { layers: ["clusters"] })[0];
    const clusterId = feature.properties.cluster_id;
    const source = map.getSource("rooms");
    const zoom = await source.getClusterExpansionZoom(clusterId);

    map.easeTo({
      center: feature.geometry.coordinates,
      zoom,
      duration: 450,
    });
  });

  map.on("click", "room-markers", (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    onRoomOpen(feature.properties.roomId, feature.geometry.coordinates);
  });

  map.on("mouseenter", "room-markers", (event) => {
    map.getCanvas().style.cursor = "pointer";
    const feature = event.features?.[0];
    if (!feature || window.matchMedia?.("(hover: none), (pointer: coarse)").matches) return;
    onRoomOpen(feature.properties.roomId, feature.geometry.coordinates);
  });

  map.on("mouseleave", "room-markers", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
}

function updateUserLocation(map, userLocation) {
  if (!userLocation) return;

  map.getSource("user-location")?.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: userLocation },
        properties: {},
      },
    ],
  });

  const radius = createRadiusPolygon(userLocation, 3);
  map.getSource("search-radius")?.setData(
    radius
      ? {
          type: "FeatureCollection",
          features: [radius],
        }
      : emptyFeatureCollection,
  );
}

function showRoomPopup(map, room, coordinates, { userLocation, onRoute }) {
  const meta = getRoomTypeMeta(room.type);
  const amenities = (room.amenities || []).slice(0, 3).join(" / ") || "Amenities pending";
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: false,
    offset: 28,
    maxWidth: "280px",
  })
    .setLngLat(coordinates)
    .setHTML(
      `<article class="rentpe-map-popup">
        <div class="rentpe-map-popup__top">
          <img src="${escapeHtml(room.coverImage || room.images?.[0] || "")}" alt="" />
          <div>
            <div class="rentpe-map-popup__meta">
              <span style="background:${meta.softColor};color:${meta.textColor}">${meta.label}</span>
              <strong>⭐ ${room.owner?.rating || "4.5"}</strong>
            </div>
            <h3>${escapeHtml(room.title)}</h3>
            <p>${formatPrice(room.price)}/month</p>
          </div>
        </div>
        <p class="rentpe-map-popup__location">${escapeHtml(room.location)}</p>
        <p class="rentpe-map-popup__amenities">${escapeHtml(amenities)}</p>
        <p class="rentpe-map-popup__distance">${escapeHtml(room.distance)}</p>
        <div class="rentpe-map-popup__actions">
          <a href="/rooms/${room.slug || room.id}">View Details</a>
          ${
            userLocation && openRouteServiceApiKey
              ? `<button type="button" data-route-room="${room.id}">Route</button>`
              : ""
          }
        </div>
      </article>`,
    )
    .addTo(map);

  popup
    .getElement()
    ?.querySelector("[data-route-room]")
    ?.addEventListener("click", () => {
      onRoute?.();
    });

  return popup;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
