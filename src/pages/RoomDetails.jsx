import { motion } from "framer-motion";
import {
  ArrowLeft,
  Box,
  Camera,
  Car,
  Check,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Snowflake,
  Star,
  Utensils,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { getRoom, rooms } from "@/data/rooms.js";
import { formatPrice } from "@/lib/format.js";
import { normalizeRoom, normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRoom, markContacted, reportRoom, toggleSavedRoom } from "@/store/roomsSlice.js";

const amenityIcons = {
  WiFi: Wifi,
  AC: Snowflake,
  Parking: Car,
  Mess: Utensils,
  "Mess Included": Utensils,
  CCTV: Camera,
  Geyser: Flame,
  "Hot Water": Flame,
  Kitchen: Utensils,
};

export default function RoomDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const savedIds = useSelector((state) => state.rooms.savedIds);
  const { activeRoom, items, error } = useSelector((state) => state.rooms);
  const staticRoom = getRoom(id);
  const itemRoom = items.find((roomItem) => roomItem.id === id || roomItem.slug === id);
  const room =
    activeRoom?.id === id || activeRoom?.slug === id
      ? activeRoom
      : itemRoom || (staticRoom ? normalizeRoom(staticRoom) : null);
  const [active, setActive] = useState(0);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    dispatch(fetchRoom(id));
  }, [dispatch, id]);

  if (!room) {
    return (
      <div className="min-h-screen bg-background font-sans text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="mb-2 text-2xl font-black">Room not found</h1>
          <p className="mb-6 text-slate-500">This listing may have been removed.</p>
          <Link
            to="/search"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-black text-background"
          >
            Browse rooms
          </Link>
        </div>
      </div>
    );
  }

  const similar = normalizeRooms(rooms)
    .filter((item) => item.id !== room.id)
    .slice(0, 3);
  const saved = savedIds.includes(room.id);

  async function onReport() {
    setReported(true);
    dispatch(
      reportRoom({ id: room.slug || room.id, reason: "User reported possible fake listing" }),
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Link
          to="/search"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-black text-slate-600 transition-colors hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Back to results
        </Link>

        <section className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_1fr]">
          <motion.div
            key={active}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 1 }}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 md:h-[460px] md:aspect-auto"
          >
            <img
              src={room.images[active]}
              alt={room.title}
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-black uppercase tracking-wide shadow-sm backdrop-blur">
              {room.tag}
            </span>
            <div className="absolute right-3 top-3 flex gap-2">
              <button className="flex size-10 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur hover:bg-card">
                <Share2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => dispatch(toggleSavedRoom(room.id))}
                className="flex size-10 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur hover:bg-card"
              >
                <Heart className={`size-4 ${saved ? "fill-brand text-brand" : ""}`} />
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
            {room.images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActive(index)}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl transition-all md:h-[148px] ${
                  active === index
                    ? "ring-2 ring-brand ring-offset-2"
                    : "opacity-80 hover:opacity-100"
                }`}
                aria-label={`View photo ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl font-black tracking-normal md:text-3xl">{room.title}</h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="size-4" />
                  {room.address}
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
                <Star className="size-4 fill-amber-500 text-amber-500" />
                <span className="text-sm font-black">{room.owner.rating}</span>
                <span className="text-xs text-slate-500">42 reviews</span>
              </div>
            </div>

            <div className="my-6 grid grid-cols-3 gap-3">
              {[
                { label: "Type", value: room.type },
                { label: "Tenant", value: room.gender },
                { label: "Furnished", value: room.furnished ? "Yes" : "No" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-card p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 font-black">{item.value}</p>
                </div>
              ))}
            </div>

            <section className="border-t border-slate-200 py-6">
              <h2 className="mb-3 text-lg font-black">About this place</h2>
              <p className="leading-7 text-slate-600">{room.description}</p>
            </section>

            <section className="border-t border-slate-200 py-6">
              <h2 className="mb-4 text-lg font-black">What this place offers</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {room.amenities.map((amenity) => {
                  const Icon = amenityIcons[amenity] ?? Box;

                  return (
                    <div key={amenity} className="flex items-center gap-2.5 text-sm font-semibold">
                      <Icon className="size-4 text-brand" />
                      {amenity}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border-t border-slate-200 py-6">
              <h2 className="mb-4 text-lg font-black">Location</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-card p-5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Area
                  </p>
                  <p className="mt-2 font-black">{room.location}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-card p-5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Full address
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{room.address}</p>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 py-6">
              <h2 className="mb-4 text-lg font-black">Nearby essentials</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(room.nearbyEssentials?.length
                  ? room.nearbyEssentials
                  : [
                      { name: "College / Office", type: "landmark", distance: "Nearby" },
                      { name: "Bus stop", type: "transit", distance: "Walkable" },
                      { name: "Market", type: "daily needs", distance: "Nearby" },
                    ]
                ).map((item) => (
                  <div
                    key={`${item.name}-${item.type}`}
                    className="rounded-xl border border-slate-200 bg-card p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {item.type}
                    </p>
                    <p className="mt-1 font-black">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.distance}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside>
            <div className="rounded-3xl border border-slate-200 bg-card p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
              <div className="mb-1 flex items-end gap-2">
                <span className="text-3xl font-black text-brand">{formatPrice(room.price)}</span>
                <span className="mb-1 text-sm text-slate-500">/month</span>
              </div>
              <p className="mb-5 text-xs text-slate-500">
                Includes electricity and maintenance estimates
              </p>

              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-brand-foreground">
                  {room.owner.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{room.owner.name}</p>
                  <p className="text-xs text-slate-500">Owner since {room.owner.since}</p>
                </div>
                {room.owner.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[10px] font-black uppercase text-success">
                    <ShieldCheck className="size-3" />
                    Verified
                  </span>
                )}
              </div>

              <a
                href={`https://wa.me/${room.owner.phone}?text=${encodeURIComponent(
                  `Hi, I am interested in your room "${room.title}" on RoomRadar.`,
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => dispatch(markContacted(room.id))}
                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 font-black text-success-foreground transition-colors hover:bg-success/90"
              >
                <MessageCircle className="size-4" />
                WhatsApp Owner
              </a>
              <a
                href={`tel:+${room.owner.phone}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-black text-ink transition-colors hover:bg-slate-50"
              >
                <Phone className="size-4" />
                Call +91 {room.owner.phone.slice(2, 7)} {room.owner.phone.slice(7)}
              </a>

              <button
                type="button"
                onClick={onReport}
                disabled={reported}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-red-100 bg-red-50 py-3 text-sm font-black text-red-700 transition-colors hover:bg-red-100 disabled:opacity-70"
              >
                {reported ? "Report received" : "Report scam listing"}
              </button>

              <ul className="mt-6 space-y-2 text-xs text-slate-600">
                {["No brokerage fee", "Direct owner contact", "Visit before payment"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-3.5 text-success" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
              {error && (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
                  {error}
                </p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-16 border-t border-slate-200 pt-10">
          <h2 className="mb-5 text-xl font-black">Similar rooms nearby</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item, index) => (
              <RoomCard key={item.id} room={item} index={index} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
