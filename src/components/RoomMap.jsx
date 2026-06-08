import { Bed, Building2, Home, LocateFixed, MapPin, Minus, Plus, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { formatPrice } from "@/lib/format.js";
import { getRoomTypeMeta, roomTypeMeta } from "@/lib/listingMeta.js";
import { mapTilerApiKey } from "@/lib/mapServices.js";

import MapLibreRoomMap from "./MapLibreRoomMap.jsx";

const markerIcons = {
  bed: Bed,
  building: Building2,
  flat: Building2,
  home: Home,
  users: Users,
};

const zoomClusterRadius = {
  1: 28,
  2: 16,
  3: 8,
};

const userPosition = { x: 50, y: 56 };

export default function RoomMap(props) {
  if (mapTilerApiKey) {
    return <MapLibreRoomMap {...props} />;
  }

  return <FallbackRoomMap {...props} />;
}

function FallbackRoomMap({ rooms, activeRoomId = "", onActiveRoomChange, className = "" }) {
  const [internalActiveId, setInternalActiveId] = useState("");
  const [activeClusterId, setActiveClusterId] = useState("");
  const [zoom, setZoom] = useState(1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const activeId = activeRoomId || internalActiveId;
  const positionedRooms = useMemo(() => getPositionedRooms(rooms), [rooms]);
  const clusters = useMemo(
    () => clusterRooms(positionedRooms, zoomClusterRadius[zoom]),
    [positionedRooms, zoom],
  );
  const activePoint = positionedRooms.find((point) => point.room.id === activeId);
  const activeCluster = clusters.find((cluster) => cluster.id === activeClusterId);

  useEffect(() => {
    const media = window.matchMedia?.("(hover: none), (pointer: coarse)");
    if (!media) return;

    setIsTouchDevice(media.matches);

    function updateDeviceState(event) {
      setIsTouchDevice(event.matches);
    }

    media.addEventListener?.("change", updateDeviceState);
    return () => media.removeEventListener?.("change", updateDeviceState);
  }, []);

  useEffect(() => {
    setActiveClusterId("");
  }, [rooms]);

  function setActiveRoom(id) {
    setInternalActiveId(id);
    onActiveRoomChange?.(id);
  }

  function openMarker(room) {
    setActiveClusterId("");
    setActiveRoom(room.id);
  }

  function openCluster(cluster) {
    setActiveRoom("");
    setActiveClusterId(cluster.id);
  }

  return (
    <section
      className={`relative min-h-[640px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-[#eef6f1] shadow-sm lg:min-h-[720px] ${className}`}
      aria-label="Room map"
    >
      <MapCanvas />

      <div className="absolute left-4 top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Map view</p>
        <p className="mt-1 text-sm font-black text-ink">{rooms.length} rooms in this search</p>
      </div>

      <div className="absolute right-4 top-4 z-20 flex overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(3, value + 1))}
          className="flex size-10 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50"
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(1, value - 1))}
          className="flex size-10 items-center justify-center border-l border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
      </div>

      <div
        className="absolute z-10 rounded-full border border-dashed border-brand/35 bg-brand/10"
        style={{
          left: `${userPosition.x}%`,
          top: `${userPosition.y}%`,
          height: `${34 + zoom * 9}%`,
          width: `${34 + zoom * 9}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="absolute z-20 flex size-11 items-center justify-center rounded-full border-4 border-white bg-ink text-white shadow-lg"
        style={{
          left: `${userPosition.x}%`,
          top: `${userPosition.y}%`,
          transform: "translate(-50%, -50%)",
        }}
        title="Your location"
      >
        <LocateFixed className="size-5" />
      </div>

      {clusters.map((cluster) =>
        cluster.points.length > 1 ? (
          <ClusterMarker
            key={cluster.id}
            cluster={cluster}
            onOpen={openCluster}
            onZoom={() => setZoom((value) => Math.min(3, value + 1))}
          />
        ) : (
          <RoomMarker
            key={cluster.points[0].room.id}
            point={cluster.points[0]}
            active={cluster.points[0].room.id === activeId}
            isTouchDevice={isTouchDevice}
            onOpen={openMarker}
          />
        ),
      )}

      {activePoint && <RoomPopup point={activePoint} />}
      {activeCluster && <ClusterPopup cluster={activeCluster} />}

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
    </section>
  );
}

function MapCanvas() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#dff2e5_0%,#eef7ff_45%,#fff7ed_100%)]" />
      <div className="absolute left-[9%] top-[15%] h-[120%] w-5 -rotate-45 rounded-full bg-white/70 shadow-sm" />
      <div className="absolute left-[38%] top-[-15%] h-[125%] w-4 rotate-[18deg] rounded-full bg-white/70 shadow-sm" />
      <div className="absolute left-[-8%] top-[62%] h-4 w-[116%] rotate-[-8deg] rounded-full bg-white/70 shadow-sm" />
      <div className="absolute left-[12%] top-[18%] h-20 w-28 rounded-[18px] bg-emerald-200/45" />
      <div className="absolute right-[12%] top-[18%] h-24 w-32 rounded-[20px] bg-sky-200/55" />
      <div className="absolute bottom-[14%] left-[22%] h-20 w-36 rounded-[20px] bg-amber-200/45" />
      <div className="absolute bottom-[16%] right-[18%] h-24 w-24 rounded-full bg-cyan-200/50" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/55 to-transparent" />
    </div>
  );
}

function RoomMarker({ point, active, isTouchDevice, onOpen }) {
  const meta = getRoomTypeMeta(point.room.type);
  const Icon = markerIcons[meta.iconKey] || Home;

  return (
    <button
      type="button"
      onMouseEnter={() => !isTouchDevice && onOpen(point.room)}
      onFocus={() => onOpen(point.room)}
      onClick={() => onOpen(point.room)}
      className={`absolute z-30 flex size-12 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-brand/20 ${
        active ? "scale-110 ring-4 ring-brand/20" : ""
      }`}
      style={{
        left: `${point.x}%`,
        top: `${point.y}%`,
        transform: "translate(-50%, -50%)",
        backgroundColor: meta.color,
      }}
      aria-label={`Open ${point.room.title}`}
      title={`${meta.label} - ${point.room.title}`}
    >
      <Icon className="size-5" />
    </button>
  );
}

function ClusterMarker({ cluster, onOpen, onZoom }) {
  function openCluster() {
    onOpen(cluster);
    onZoom();
  }

  return (
    <button
      type="button"
      onMouseEnter={() => onOpen(cluster)}
      onFocus={() => onOpen(cluster)}
      onClick={openCluster}
      className="absolute z-30 flex size-14 items-center justify-center rounded-full border-4 border-white bg-ink text-sm font-black text-white shadow-xl transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-brand/20"
      style={{
        left: `${cluster.x}%`,
        top: `${cluster.y}%`,
        transform: "translate(-50%, -50%)",
      }}
      aria-label={`${cluster.points.length} rooms in this area`}
      title="Cluster marker"
    >
      {cluster.points.length}
    </button>
  );
}

function RoomPopup({ point }) {
  const room = point.room;
  const meta = getRoomTypeMeta(room.type);
  const position = getPopupPosition(point);
  const amenities = (room.amenities || []).slice(0, 3).join(" / ");

  return (
    <article
      className="absolute z-40 w-[260px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xl"
      style={position}
    >
      <div className="flex gap-3">
        <img
          src={room.coverImage || room.images?.[0]}
          alt=""
          className="size-20 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black"
              style={{ backgroundColor: meta.softColor, color: meta.textColor }}
            >
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-600">
              <Star className="size-3 fill-amber-500" />
              {room.owner?.rating || "4.5"}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-black text-ink">{room.title}</h3>
          <p className="mt-1 text-sm font-black text-brand">{formatPrice(room.price)}/month</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <MapPin className="size-3.5" />
        <span className="truncate">{room.location}</span>
      </p>
      <p className="mt-2 truncate text-xs font-bold text-slate-600">
        {amenities || "Amenities pending"}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">{room.distance}</p>
      <Link
        to={`/rooms/${room.slug || room.id}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-slate-800"
      >
        View Details
      </Link>
    </article>
  );
}

function ClusterPopup({ cluster }) {
  const position = getPopupPosition(cluster);

  return (
    <article
      className="absolute z-40 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xl"
      style={position}
    >
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {cluster.points.length} rooms in this area
      </p>
      <div className="mt-3 space-y-2">
        {cluster.points.slice(0, 4).map(({ room }) => {
          const meta = getRoomTypeMeta(room.type);

          return (
            <Link
              key={room.id}
              to={`/rooms/${room.slug || room.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-2 transition-colors hover:border-brand"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-black"
                style={{ backgroundColor: meta.softColor, color: meta.textColor }}
              >
                {meta.label.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-ink">{room.title}</span>
                <span className="text-xs font-bold text-brand">{formatPrice(room.price)}/mo</span>
              </span>
            </Link>
          );
        })}
      </div>
    </article>
  );
}

function getPopupPosition(point) {
  const x = clamp(point.x, 8, 92);
  const y = clamp(point.y, 10, 90);
  const horizontalShift = x > 68 ? "-100%" : x < 32 ? "0" : "-50%";
  const verticalShift = y > 58 ? "-100%" : "0";

  return {
    left: `${x > 68 ? x - 2 : x < 32 ? x + 2 : x}%`,
    top: `${y > 58 ? y - 4 : y + 4}%`,
    transform: `translate(${horizontalShift}, ${verticalShift})`,
  };
}

function getPositionedRooms(rooms) {
  const geoRooms = rooms
    .map((room, index) => ({ room, index, coords: room.geoCoordinates }))
    .filter(({ coords }) => Array.isArray(coords) && coords.length === 2);
  const bounds = getGeoBounds(geoRooms);

  return rooms.map((room, index) => {
    if (room.coords && Number.isFinite(room.coords.x) && Number.isFinite(room.coords.y)) {
      return {
        room,
        x: clamp(room.coords.x, 8, 92),
        y: clamp(room.coords.y, 10, 90),
      };
    }

    if (Array.isArray(room.geoCoordinates) && room.geoCoordinates.length === 2 && bounds) {
      const [longitude, latitude] = room.geoCoordinates;
      const longitudeRange = bounds.maxLongitude - bounds.minLongitude || 0.01;
      const latitudeRange = bounds.maxLatitude - bounds.minLatitude || 0.01;
      const x = 12 + ((longitude - bounds.minLongitude) / longitudeRange) * 76;
      const y = 88 - ((latitude - bounds.minLatitude) / latitudeRange) * 76;

      return { room, x: clamp(x, 8, 92), y: clamp(y, 10, 90) };
    }

    const angle = index * 2.3999632297;
    return {
      room,
      x: clamp(50 + Math.cos(angle) * 28, 8, 92),
      y: clamp(52 + Math.sin(angle) * 24, 10, 90),
    };
  });
}

function getGeoBounds(geoRooms) {
  if (!geoRooms.length) return null;

  const longitudes = geoRooms.map(({ coords }) => coords[0]);
  const latitudes = geoRooms.map(({ coords }) => coords[1]);

  return {
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
  };
}

function clusterRooms(points, radius) {
  const remaining = [...points];
  const clusters = [];

  while (remaining.length) {
    const seed = remaining.shift();
    const grouped = [seed];

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const point = remaining[index];
      if (distanceBetween(seed, point) <= radius) {
        grouped.push(point);
        remaining.splice(index, 1);
      }
    }

    const x = grouped.reduce((sum, point) => sum + point.x, 0) / grouped.length;
    const y = grouped.reduce((sum, point) => sum + point.y, 0) / grouped.length;
    const id = grouped
      .map((point) => point.room.id)
      .sort()
      .join("|");

    clusters.push({ id, x, y, points: grouped });
  }

  return clusters;
}

function distanceBetween(firstPoint, secondPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
