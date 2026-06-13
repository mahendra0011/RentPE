import maplibregl from "maplibre-gl";
import {
  BedSingle,
  Building2,
  Home,
  Hotel,
  LocateFixed,
  Loader2,
  MapPin,
  Maximize2,
  Navigation,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Map as MapCanvas } from "@/components/ui/map.jsx";
import { useMap } from "@/components/ui/mapContext.js";
import { apiRequest } from "@/lib/api.js";
import { formatPrice } from "@/lib/format.js";
import { withFallbackRoomCoordinates } from "@/lib/mapFallbackCoordinates.js";
import { getMapTilerStyle } from "@/lib/mapStyles.js";
import { getRoomTypeMeta } from "@/lib/listingMeta.js";

const roomTypeUi = {
  "Single Room": {
    Icon: Home,
    label: "Single",
    color: "#2563eb",
    soft: "bg-blue-50 text-blue-700",
  },
  PG: {
    Icon: Building2,
    label: "PG",
    color: "#16a34a",
    soft: "bg-emerald-50 text-emerald-700",
  },
  "Shared Room": {
    Icon: Users,
    label: "Shared",
    color: "#7c3aed",
    soft: "bg-violet-50 text-violet-700",
  },
  Flat: {
    Icon: Hotel,
    label: "Flat",
    color: "#f97316",
    soft: "bg-orange-50 text-orange-700",
  },
  Hostel: {
    Icon: BedSingle,
    label: "Hostel",
    color: "#0891b2",
    soft: "bg-cyan-50 text-cyan-700",
  },
};

const roomPopupMapOffset = [0, 142];

export default function RoomLocationMap({
  room,
  rooms = [],
  mapCity = "",
  selectedRoomId = "",
  hoveredRoomId = "",
  onRoomSelect,
}) {
  const savedCoordinates = useMemo(() => getRoomCoordinates(room), [room]);
  const geocodePath = useMemo(() => getGeocodePath(room), [room]);
  const mapStyle = useMemo(() => getMapTilerStyle(import.meta.env.VITE_MAPTILER_API_KEY), []);
  const [geocodedCoordinates, setGeocodedCoordinates] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState("idle");
  const [geocodeError, setGeocodeError] = useState("");
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeSummary, setRouteSummary] = useState("");
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [trackingUserLocation, setTrackingUserLocation] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [selectedRoomKey, setSelectedRoomKey] = useState("");
  const controlledSelectedRoomKey = String(selectedRoomId || "");
  const exactCoordinates = savedCoordinates || geocodedCoordinates;
  const resolvedRoom = useMemo(() => {
    if (!exactCoordinates || savedCoordinates) return room;
    return { ...room, geoCoordinates: exactCoordinates };
  }, [exactCoordinates, room, savedCoordinates]);
  const scopedRooms = useMemo(
    () => getCityScopedRooms(resolvedRoom, rooms, mapCity),
    [mapCity, resolvedRoom, rooms],
  );
  const cityRooms = useMemo(
    () => withFallbackRoomCoordinates(scopedRooms, resolvedRoom),
    [resolvedRoom, scopedRooms],
  );
  const activeMapRoom = useMemo(
    () => cityRooms.find((cityRoom) => isSameRoom(cityRoom, resolvedRoom)) || resolvedRoom,
    [cityRooms, resolvedRoom],
  );
  const selectedMapRoom = useMemo(() => {
    const selectedRoom = cityRooms.find(
      (cityRoom) => getStableRoomKey(cityRoom) === (controlledSelectedRoomKey || selectedRoomKey),
    );
    return selectedRoom || activeMapRoom;
  }, [activeMapRoom, cityRooms, controlledSelectedRoomKey, selectedRoomKey]);
  const selectedCoordinates = getRoomCoordinates(selectedMapRoom);
  const coordinates = selectedCoordinates || exactCoordinates || getRoomCoordinates(activeMapRoom);
  const cityRoomsCenter = useMemo(() => getRoomsCenter(cityRooms), [cityRooms]);
  const mapCenter = cityRoomsCenter || coordinates;
  const mapScopeLabel = mapCity || room?.city || "Selected city";
  const handleRoomSelect = useCallback(
    (roomKey) => {
      setSelectedRoomKey(roomKey);
      onRoomSelect?.(roomKey);
    },
    [onRoomSelect],
  );

  useEffect(() => {
    if (controlledSelectedRoomKey) return;

    const activeKey = getStableRoomKey(activeMapRoom);
    const selectedExists = cityRooms.some(
      (cityRoom) => getStableRoomKey(cityRoom) === selectedRoomKey,
    );

    if (activeKey && (!selectedRoomKey || !selectedExists)) {
      setSelectedRoomKey(activeKey);
    }
  }, [activeMapRoom, cityRooms, controlledSelectedRoomKey, selectedRoomKey]);

  useEffect(() => {
    setRouteCoordinates([]);
    setRouteSummary("");
    setRouteError("");
  }, [controlledSelectedRoomKey, selectedRoomKey]);

  useEffect(() => {
    if (!trackingUserLocation) return undefined;

    if (!navigator.geolocation) {
      setLocationError("Location permission is not available in this browser.");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserCoordinates([position.coords.longitude, position.coords.latitude]);
        setLocationError("");
      },
      () => setLocationError("Allow location permission to show live location."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingUserLocation]);

  useEffect(() => {
    setGeocodedCoordinates(null);
    setGeocodeError("");

    if (savedCoordinates || !geocodePath) {
      setGeocodeStatus("idle");
      return undefined;
    }

    let ignore = false;
    setGeocodeStatus("loading");

    apiRequest(geocodePath)
      .then((payload) => {
        if (ignore) return;

        const nextCoordinates = getPayloadCoordinates(payload);
        if (!nextCoordinates) {
          throw new Error("Map coordinates were not found for this address.");
        }

        setGeocodedCoordinates(nextCoordinates);
        setGeocodeStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setGeocodeStatus("failed");
        setGeocodeError(error.message || "Map location is not available right now.");
      });

    return () => {
      ignore = true;
    };
  }, [geocodePath, savedCoordinates]);

  useEffect(() => {
    if (!fullscreenOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreenOpen]);

  if (!coordinates) {
    const isLoading = geocodeStatus === "loading";

    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center sm:min-h-[460px]">
        <div>
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <MapPin className="size-5" />
            )}
          </span>
          <p className="font-black text-ink">
            {isLoading ? "Finding map location" : "Map location pending"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
            {geocodeError || "Owner address is saved. Coordinates will appear after geocoding."}
          </p>
        </div>
      </div>
    );
  }

  async function showRouteFromUser() {
    setRouteError("");
    setLocationError("");
    setRouteLoading(true);

    try {
      if (!selectedCoordinates) {
        throw new Error("Select a room on the map first.");
      }

      const userCoordinates = await getUserCoordinates();
      setUserCoordinates(userCoordinates);
      setTrackingUserLocation(true);
      const route = await apiRequest("/api/geo/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: userCoordinates,
          end: selectedCoordinates,
          profile: "foot-walking",
        }),
      });
      const nextRouteCoordinates = getFirstLineCoordinates(route);

      if (!nextRouteCoordinates.length) {
        throw new Error("Route not available for this location.");
      }

      setRouteCoordinates(nextRouteCoordinates);
      setRouteSummary(formatRouteSummary(route?.features?.[0]?.properties?.summary));
    } catch (error) {
      setRouteError(getRouteErrorMessage(error));
    } finally {
      setRouteLoading(false);
    }
  }

  async function showUserLocation() {
    setLocationError("");
    setLocationLoading(true);

    try {
      const nextUserCoordinates = await getUserCoordinates();
      setUserCoordinates(nextUserCoordinates);
      setTrackingUserLocation(true);
    } catch (error) {
      setLocationError(getRouteErrorMessage(error));
    } finally {
      setLocationLoading(false);
    }
  }

  return (
    <>
      {!fullscreenOpen && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <RoomMapSurface
            selectedRoom={selectedMapRoom}
            rooms={cityRooms}
            center={mapCenter}
            mapStyle={mapStyle}
            routeCoordinates={routeCoordinates}
            routeLoading={routeLoading}
            userCoordinates={userCoordinates}
            locationLoading={locationLoading}
            onRoute={showRouteFromUser}
            onRoomSelect={handleRoomSelect}
            hoveredRoomId={hoveredRoomId}
            onUserLocation={showUserLocation}
            onFullscreen={() => setFullscreenOpen(true)}
            fitToRooms={cityRooms.length > 1}
            className="h-[520px] w-full sm:h-[580px] lg:h-[640px]"
          />
          <div className="border-t border-slate-200 bg-card px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-600">
                <MapPin className="size-4 shrink-0 text-brand" />
                <span className="truncate">{room.address || room.location}</span>
              </p>
              {(routeSummary || routeError || locationError) && (
                <p
                  className={`text-xs font-black ${
                    routeError || locationError ? "text-red-600" : "text-brand"
                  }`}
                >
                  {routeError || locationError || routeSummary}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenOpen && (
        <div className="fixed inset-0 z-[120] bg-white">
          <div className="absolute left-0 right-0 top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{mapScopeLabel} rooms</p>
                <p className="text-xs font-bold text-slate-500">Select a room, then tap Route</p>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenOpen(false)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
                aria-label="Close full map"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <RoomMapSurface
            selectedRoom={selectedMapRoom}
            rooms={cityRooms}
            center={mapCenter}
            mapStyle={mapStyle}
            routeCoordinates={routeCoordinates}
            routeLoading={routeLoading}
            userCoordinates={userCoordinates}
            locationLoading={locationLoading}
            onRoute={showRouteFromUser}
            onRoomSelect={handleRoomSelect}
            hoveredRoomId={hoveredRoomId}
            onUserLocation={showUserLocation}
            fitToRooms
            fullscreen
            className="h-screen w-screen pt-[65px]"
          />
        </div>
      )}
    </>
  );
}

function RoomMapSurface({
  selectedRoom,
  rooms,
  center,
  mapStyle,
  routeCoordinates,
  routeLoading,
  userCoordinates,
  locationLoading,
  onRoute,
  onRoomSelect,
  hoveredRoomId,
  onUserLocation,
  onFullscreen,
  fitToRooms = false,
  fullscreen = false,
  className,
}) {
  return (
    <MapCanvas
      center={center}
      zoom={fullscreen ? 12 : 14}
      styles={{ light: mapStyle, dark: mapStyle }}
      className={className}
    >
      <MapBoundsController rooms={rooms} fitToRooms={fitToRooms} />
      <RoomDomMarkers
        rooms={rooms}
        selectedRoom={selectedRoom}
        hoveredRoomId={hoveredRoomId}
        onRoomSelect={onRoomSelect}
      />
      <UserLocationMarker coordinates={userCoordinates} />
      <RoomRoute coordinates={routeCoordinates} />
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/88 p-1.5 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.65)] backdrop-blur-md">
        <button
          type="button"
          onClick={onUserLocation}
          disabled={locationLoading}
          className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand shadow-sm transition-colors hover:border-brand hover:bg-brand-soft disabled:cursor-wait disabled:opacity-75"
          aria-label="Show my live location"
          title="Show my live location"
        >
          {locationLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onRoute}
          disabled={routeLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-xs font-black text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-75"
          aria-label="Show route to selected room"
          title="Show route to selected room"
        >
          {routeLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Navigation className="size-4" />
          )}
          Route
        </button>
        {onFullscreen && (
          <button
            type="button"
            onClick={onFullscreen}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
            aria-label="Open full map"
            title="Open full map"
          >
            <Maximize2 className="size-4" />
            Full map
          </button>
        )}
      </div>
    </MapCanvas>
  );
}

function MapBoundsController({ rooms, fitToRooms }) {
  const { map, isLoaded } = useMap();
  const boundsKey = useMemo(
    () =>
      rooms
        .map((room) => getRoomCoordinates(room)?.join(",") || "")
        .filter(Boolean)
        .join("|"),
    [rooms],
  );

  useEffect(() => {
    if (!map || !isLoaded || !fitToRooms || !boundsKey) return;

    const coordinates = rooms.map(getRoomCoordinates).filter(Boolean);
    if (coordinates.length > 1) fitMapToCoordinates(map, coordinates);
  }, [boundsKey, fitToRooms, isLoaded, map, rooms]);

  return null;
}

function RoomDomMarkers({ rooms, selectedRoom, hoveredRoomId = "", onRoomSelect }) {
  const { map } = useMap();
  const popupRef = useRef(null);
  const popupOwnerKeyRef = useRef("");
  const markersRef = useRef(new Map());
  const externalHoverRoomRef = useRef("");
  const selectedRoomKeyRef = useRef("");
  const roomsRenderKey = useMemo(
    () =>
      rooms
        .map((room) => {
          const coordinates = getRoomCoordinates(room)?.join(",") || "";
          return `${getStableRoomKey(room)}:${coordinates}`;
        })
        .join("|"),
    [rooms],
  );

  useEffect(() => {
    if (!map) return undefined;

    const markerRecords = markersRef.current;
    markerRecords.clear();
    const markers = rooms
      .map((room) => {
        const coordinates = getRoomCoordinates(room);
        if (!coordinates) return null;

        const roomKey = getStableRoomKey(room);
        const markerElements = createRoomMarkerElement(room);
        const properties = getRoomFeature(room, null)?.properties;
        const marker = new maplibregl.Marker({
          anchor: "center",
          element: markerElements.element,
        })
          .setLngLat(coordinates)
          .addTo(map);

        function showPopup({ centerInMap = false } = {}) {
          if (!properties) return;
          popupRef.current?.remove();
          popupOwnerKeyRef.current = roomKey;
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 22,
          })
            .setLngLat(coordinates)
            .setHTML(createRoomPopupHtml(properties))
            .addTo(map);

          if (centerInMap) focusOnMap();
        }

        function hidePopup() {
          if (selectedRoomKeyRef.current === roomKey) return;

          popupRef.current?.remove();
          popupRef.current = null;
          popupOwnerKeyRef.current = "";

          const selectedRecord = markerRecords.get(selectedRoomKeyRef.current);
          selectedRecord?.showPopup();
        }

        function focusOnMap() {
          map.flyTo({
            center: coordinates,
            zoom: Math.max(map.getZoom(), 14),
            offset: roomPopupMapOffset,
            duration: 520,
          });
        }

        function handleClick(event) {
          event.preventDefault();
          event.stopPropagation();
          selectedRoomKeyRef.current = roomKey;
          onRoomSelect?.(roomKey);
          showPopup({ centerInMap: true });
        }

        markerElements.button.addEventListener("click", handleClick);
        markerElements.button.addEventListener("mouseenter", showPopup);
        markerElements.button.addEventListener("mouseleave", hidePopup);

        const markerRecord = {
          focusOnMap,
          hidePopup,
          handleClick,
          marker,
          markerElements,
          room,
          roomKey,
          showPopup,
        };
        markerRecords.set(roomKey, markerRecord);

        return markerRecord;
      })
      .filter(Boolean);

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      popupOwnerKeyRef.current = "";
      markerRecords.clear();
      markers.forEach(({ hidePopup, handleClick, marker, markerElements, showPopup }) => {
        markerElements.button.removeEventListener("click", handleClick);
        markerElements.button.removeEventListener("mouseenter", showPopup);
        markerElements.button.removeEventListener("mouseleave", hidePopup);
        marker.remove();
      });
    };
  }, [map, onRoomSelect, rooms, roomsRenderKey]);

  useEffect(() => {
    const selectedKey = getStableRoomKey(selectedRoom);
    let selectedRecord = null;

    selectedRoomKeyRef.current = selectedKey;

    markersRef.current.forEach(({ markerElements, room, roomKey }) => {
      if (roomKey === selectedKey) {
        selectedRecord = markersRef.current.get(roomKey);
      }

      setRoomMarkerButtonStyle(
        markerElements.button,
        getRoomTypeUi(room.type),
        roomKey === selectedKey,
      );
    });

    if (selectedRecord) {
      selectedRecord.showPopup({ centerInMap: true });
    }
  }, [roomsRenderKey, selectedRoom]);

  useEffect(() => {
    const hoverKey = String(hoveredRoomId || "");

    if (!hoverKey) {
      if (externalHoverRoomRef.current) {
        const selectedRecord = markersRef.current.get(selectedRoomKeyRef.current);

        popupRef.current?.remove();
        popupRef.current = null;
        popupOwnerKeyRef.current = "";
        externalHoverRoomRef.current = "";
        selectedRecord?.showPopup({ centerInMap: true });
      }
      return;
    }

    const markerRecord = markersRef.current.get(hoverKey);
    if (!markerRecord) return;

    externalHoverRoomRef.current = hoverKey;
    markerRecord.showPopup({ centerInMap: true });
  }, [hoveredRoomId]);

  return null;
}

function UserLocationMarker({ coordinates }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !coordinates) return undefined;

    const element = createUserLocationMarkerElement();
    const marker = new maplibregl.Marker({
      anchor: "center",
      element,
    })
      .setLngLat(coordinates)
      .addTo(map);

    return () => marker.remove();
  }, [coordinates, isLoaded, map]);

  return null;
}

function createRoomMarkerElement(room) {
  const typeUi = getRoomTypeUi(room.type);
  const element = document.createElement("div");
  const button = document.createElement("button");

  element.style.cssText = [
    "align-items:center",
    "display:flex",
    "height:48px",
    "justify-content:center",
    "pointer-events:auto",
    "width:48px",
  ].join(";");

  button.type = "button";
  button.title = room.title || typeUi.label;
  button.setAttribute("aria-label", `Select ${room.title || typeUi.label}`);
  button.innerHTML = getMarkerSvg(typeUi.label);
  button.style.cssText = [
    "align-items:center",
    "border:3px solid #fff",
    "border-radius:14px",
    "box-shadow:0 16px 34px -18px rgba(15,23,42,.9)",
    "color:#fff",
    "cursor:pointer",
    "display:flex",
    "justify-content:center",
    "transition:transform .18s ease, box-shadow .18s ease, background .18s ease",
  ].join(";");
  setRoomMarkerButtonStyle(button, typeUi, false);

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-2px) scale(1.06)";
    button.style.boxShadow = "0 22px 46px -20px rgba(15,23,42,.95)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "";
    button.style.boxShadow = "0 16px 34px -18px rgba(15,23,42,.9)";
  });

  element.append(button);

  return { button, element };
}

function setRoomMarkerButtonStyle(button, typeUi, selected) {
  button.style.background = selected ? "#0f172a" : typeUi.color;
  button.style.height = selected ? "42px" : "36px";
  button.style.width = selected ? "42px" : "36px";
}

function createUserLocationMarkerElement() {
  const element = document.createElement("div");

  element.setAttribute("aria-label", "Your live location");
  element.style.cssText = [
    "align-items:center",
    "display:flex",
    "height:46px",
    "justify-content:center",
    "pointer-events:none",
    "position:relative",
    "width:46px",
  ].join(";");
  element.innerHTML = `
    <span style="position:absolute; inset:4px; border-radius:999px; background:rgba(37,99,235,.18); box-shadow:0 0 0 12px rgba(37,99,235,.09);"></span>
    <span style="align-items:center; background:#2563eb; border:3px solid #fff; border-radius:999px; box-shadow:0 18px 42px -20px rgba(37,99,235,.9); color:#fff; display:flex; height:30px; justify-content:center; position:relative; width:30px;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 2v3"></path>
        <path d="M12 19v3"></path>
        <path d="M2 12h3"></path>
        <path d="M19 12h3"></path>
      </svg>
    </span>
  `;

  return element;
}

function getMarkerSvg(type) {
  const common = `width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    Single: `<svg ${common}><path d="m3 10.5 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    PG: `<svg ${common}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8"/><path d="M18 9h2a2 2 0 0 1 2 2v11"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/></svg>`,
    Shared: `<svg ${common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    Flat: `<svg ${common}><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h.01"/><path d="M9 13h.01"/><path d="M9 17h.01"/></svg>`,
    Hostel: `<svg ${common}><path d="M2 4v16"/><path d="M22 12v8"/><path d="M2 12h20"/><path d="M4 8h7a3 3 0 0 1 3 3v1"/><path d="M14 12v-1a3 3 0 0 1 3-3h3"/></svg>`,
  };

  return icons[type] || icons.Single;
}

function RoomRoute({ coordinates }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return undefined;

    const sourceId = "room-route-source";
    const haloLayerId = "room-route-halo-layer";
    const layerId = "room-route-layer";
    const routeData = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {},
    };

    const existingRouteSource = getMapSource(map, sourceId);

    if (existingRouteSource) {
      existingRouteSource.setData(routeData);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        lineMetrics: true,
        data: routeData,
      });
      map.addLayer({
        id: haloLayerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": 10,
          "line-opacity": 0.92,
        },
      });
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "#2563eb",
            0.55,
            "#7c3aed",
            1,
            "#f97316",
          ],
          "line-width": 5.5,
          "line-opacity": 0.95,
        },
      });
    }

    const bounds = coordinates.reduce(
      (nextBounds, coordinate) => nextBounds.extend(coordinate),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    map.fitBounds(bounds, {
      padding: { top: 92, bottom: 168, left: 72, right: 72 },
      maxZoom: 15,
      duration: 650,
    });

    return () => {
      removeMapLayers(map, [layerId, haloLayerId]);
      removeMapSource(map, sourceId);
    };
  }, [coordinates, isLoaded, map]);

  return null;
}

function getCityScopedRooms(activeRoom, rooms, mapCity) {
  const city = String(mapCity || "").toLowerCase();
  const cityRooms = rooms.filter((room) => {
    if (!city) return true;
    return String(room.city || "").toLowerCase() === city;
  });
  const activeRoomIncluded = cityRooms.some((room) => isSameRoom(room, activeRoom));

  if (activeRoom && !activeRoomIncluded) return [activeRoom, ...cityRooms];

  return cityRooms;
}

function isSameRoom(room, activeRoom) {
  return Boolean(
    activeRoom &&
    ((room.id && String(room.id) === String(activeRoom.id)) ||
      (room.slug && String(room.slug) === String(activeRoom.slug))),
  );
}

function getRoomFeature(room, activeRoom) {
  const coordinates = getRoomCoordinates(room);
  if (!coordinates) return null;

  const meta = getRoomTypeMeta(room.type);
  const typeUi = getRoomTypeUi(meta.label);
  const selected =
    String(room.id) === String(activeRoom?.id) || String(room.slug) === String(activeRoom?.slug);

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates,
    },
    properties: {
      id: String(room.id || room.slug || ""),
      roomKey: getStableRoomKey(room),
      slug: String(room.slug || room.id || ""),
      title: room.title || meta.label,
      type: meta.label,
      rent: formatPrice(room.price),
      image: room.coverImage || room.images?.[0] || "",
      rating: Number(room.owner?.rating || 0),
      reviewCount: getReviewCount(room.owner?.reviewCount),
      amenities: (room.amenities || []).slice(0, 3).join(" \u2022 "),
      location: room.location || room.address || room.city || "",
      city: room.city || "",
      distance: room.distance || "",
      color: typeUi.color || meta.color,
      selected: selected ? 1 : 0,
    },
  };
}

function getRoomTypeUi(type) {
  const meta = getRoomTypeMeta(type);
  return roomTypeUi[meta.label] || roomTypeUi["Single Room"];
}

function getStableRoomKey(room) {
  return String(room?.id || room?.slug || "");
}

function getRoomsCenter(rooms) {
  const coordinates = rooms.map(getRoomCoordinates).filter(Boolean);
  if (!coordinates.length) return null;

  const [longitudeTotal, latitudeTotal] = coordinates.reduce(
    ([longitudeSum, latitudeSum], [longitude, latitude]) => [
      longitudeSum + longitude,
      latitudeSum + latitude,
    ],
    [0, 0],
  );

  return [longitudeTotal / coordinates.length, latitudeTotal / coordinates.length];
}

function fitMapToCoordinates(map, coordinates) {
  const bounds = coordinates.reduce(
    (nextBounds, coordinate) => nextBounds.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );

  map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
}

function removeMapLayers(map, layerIds) {
  layerIds.forEach((layerId) => {
    try {
      if (map?.getLayer?.(layerId)) map.removeLayer(layerId);
    } catch {
      // MapLibre can clear its style before React effect cleanup runs.
    }
  });
}

function removeMapSource(map, sourceId) {
  try {
    if (map?.getSource?.(sourceId)) map.removeSource(sourceId);
  } catch {
    // MapLibre can clear its style before React effect cleanup runs.
  }
}

function getMapSource(map, sourceId) {
  try {
    return map?.getSource?.(sourceId) || null;
  } catch {
    return null;
  }
}

function getRoomCoordinates(room) {
  if (Array.isArray(room?.geoCoordinates) && room.geoCoordinates.length === 2) {
    const [longitude, latitude] = room.geoCoordinates.map(Number);
    if (isValidCoordinate(longitude, latitude)) return [longitude, latitude];
  }

  if (room?.location?.type === "Point" && Array.isArray(room.location.coordinates)) {
    const [longitude, latitude] = room.location.coordinates.map(Number);
    if (isValidCoordinate(longitude, latitude)) return [longitude, latitude];
  }

  return null;
}

function getGeocodePath(room) {
  const params = new URLSearchParams();
  const fields = {
    address: room?.address,
    city: room?.city,
    state: room?.state,
    landmark: room?.landmark,
  };

  Object.entries(fields).forEach(([key, value]) => {
    const trimmedValue = String(value || "").trim();
    if (trimmedValue) params.set(key, trimmedValue);
  });

  const query = params.toString();
  return query ? `/api/geo/geocode?${query}` : "";
}

function getPayloadCoordinates(payload) {
  if (Array.isArray(payload?.coordinates) && payload.coordinates.length === 2) {
    const [longitude, latitude] = payload.coordinates.map(Number);
    if (isValidCoordinate(longitude, latitude)) return [longitude, latitude];
  }

  if (Array.isArray(payload?.location?.coordinates) && payload.location.coordinates.length === 2) {
    const [longitude, latitude] = payload.location.coordinates.map(Number);
    if (isValidCoordinate(longitude, latitude)) return [longitude, latitude];
  }

  return null;
}

function getFirstLineCoordinates(route) {
  const geometry = route?.features?.[0]?.geometry;
  if (!geometry) return [];
  if (geometry.type === "LineString") return geometry.coordinates || [];
  if (geometry.type === "MultiLineString") return geometry.coordinates?.[0] || [];
  return [];
}

function getUserCoordinates() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location permission is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      () => reject(new Error("Allow location permission to show route.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

function formatRouteSummary(summary) {
  if (!summary) return "";

  const distanceKm = Number(summary.distance || 0) / 1000;
  const durationMinutes = Math.round(Number(summary.duration || 0) / 60);

  if (!distanceKm && !durationMinutes) return "";

  return `${distanceKm.toFixed(1)} km | ${durationMinutes || 1} min`;
}

function getRouteErrorMessage(error) {
  if (error?.htmlResponse || error?.networkError) {
    return "Route API is not connected.";
  }

  return error.message || "Route not available right now.";
}

function createRoomPopupHtml(properties) {
  const detailPath = `/#/rooms/${encodeURIComponent(properties.slug || properties.id)}`;

  return `
    <article style="width: 242px; overflow: hidden; border-radius: 18px; background: #ffffff; color: #0f172a; font-family: Inter, system-ui, sans-serif;">
      ${
        properties.image
          ? `<img src="${escapeAttribute(
              properties.image,
            )}" alt="" style="display: block; height: 104px; width: 100%; object-fit: cover;" />`
          : ""
      }
      <div style="padding: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <p style="margin: 0; font-size: 13px; font-weight: 900;">${escapeHtml(
            properties.type,
          )}</p>
          <span style="display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; background: #fef3c7; padding: 3px 7px; color: #b45309; font-size: 11px; font-weight: 900;">
            <span aria-label="${escapeAttribute(getRatingAriaLabel(properties.rating))}">${getPopupStarsHtml(
              properties.rating,
            )}</span>
            <span style="color: #64748b; font-size: 10px;">${escapeHtml(
              formatReviewLabel(properties.reviewCount),
            )}</span>
          </span>
        </div>
        <p style="margin: 8px 0 0; color: #7c3aed; font-size: 18px; font-weight: 950;">${escapeHtml(
          properties.rent,
        )}<span style="margin-left: 2px; color: #94a3b8; font-size: 10px; font-weight: 900; text-transform: uppercase;">/month</span></p>
        <p style="margin: 7px 0 0; color: #475569; font-size: 12px; font-weight: 800; line-height: 1.35;">${escapeHtml(
          properties.location,
        )}</p>
        ${
          properties.amenities
            ? `<p style="margin: 8px 0 0; color: #64748b; font-size: 11px; font-weight: 800; line-height: 1.35;">${escapeHtml(
                properties.amenities,
              )}</p>`
            : ""
        }
        ${
          properties.distance || properties.city
            ? `<p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px; font-weight: 900;">${escapeHtml(
                properties.distance || properties.city,
              )}</p>`
            : ""
        }
        <a href="${escapeAttribute(
          detailPath,
        )}" style="margin-top: 11px; display: flex; min-height: 34px; align-items: center; justify-content: center; border-radius: 999px; background: #111827; color: #ffffff; font-size: 12px; font-weight: 900; text-decoration: none;">
          View Details
        </a>
      </div>
    </article>
  `;
}

function getPopupStarsHtml(rating) {
  const filledStars = Math.round(clamp(Number(rating) || 0, 0, 5));

  return Array.from({ length: 5 }, (_, index) => {
    const color = index < filledStars ? "#f59e0b" : "#fde68a";
    return `<span style="color:${color}">&#9733;</span>`;
  }).join("");
}

function getRatingAriaLabel(rating) {
  const ratingValue = clamp(Number(rating) || 0, 0, 5);
  return `${ratingValue.toFixed(1)} out of 5 stars`;
}

function formatReviewLabel(value) {
  const count = getReviewCount(value);
  if (!count) return "No reviews yet";
  return `${count} ${count === 1 ? "review" : "reviews"}`;
}

function getReviewCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isValidCoordinate(longitude, latitude) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
