import { Building2, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { apiRequest } from "@/lib/api.js";
import { formatPrice } from "@/lib/format.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { items, savedIds, contactedIds, postedIds } = useSelector((state) => state.rooms);
  const rooms = items.length ? items : normalizeRooms(staticRooms);
  const savedRooms = rooms.filter((room) => savedIds.includes(room.id));
  const contactedRooms = rooms.filter((room) => contactedIds.includes(room.id));
  const [ownerRooms, setOwnerRooms] = useState([]);
  const isOwner = user?.role === "owner";
  const ownerAvailableCount = ownerRooms.filter((room) => room.availability === "available").length;
  const ownerOccupiedCount = ownerRooms.filter((room) => room.availability === "occupied").length;
  const averageOwnerRent = ownerRooms.length
    ? Math.round(
        ownerRooms.reduce((sum, room) => sum + Number(room.price || 0), 0) / ownerRooms.length,
      )
    : 0;

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    if (!isOwner) {
      setOwnerRooms([]);
      return;
    }

    let active = true;

    async function loadOwnerRooms() {
      try {
        const payload = await apiRequest("/api/rooms/mine");
        if (active) setOwnerRooms(normalizeRooms(payload));
      } catch {
        if (active) setOwnerRooms([]);
      }
    }

    loadOwnerRooms();

    return () => {
      active = false;
    };
  }, [isOwner]);

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6">
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <span className="mb-2 sm:mb-3 inline-flex rounded-full bg-brand-soft px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wide text-brand">
              {isOwner ? "Owner dashboard" : "User dashboard"}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-normal">
              {isOwner ? "Your RentPE owner activity" : "Your RentPE activity"}
            </h1>
            <p className="mt-1 sm:mt-2 max-w-2xl text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500">
              {isOwner
                ? "Track your listings, availability, leads, saved rooms, and seeker activity."
                : "Track saved rooms, contacted owners, and properties you have posted."}
            </p>
          </div>
          <Link
            to="/my-rooms"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-ink px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-background"
          >
            <Building2 className="size-3.5 sm:size-4" />
            My listed rooms
          </Link>
        </div>

        <section className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {isOwner ? (
            <>
              <Metric icon={Building2} label="Live listings" value={ownerRooms.length} tone="ink" />
              <Metric
                icon={ShieldCheck}
                label="Available"
                value={ownerAvailableCount}
                tone="success"
              />
              <Metric
                icon={MessageCircle}
                label="Occupied"
                value={ownerOccupiedCount}
                tone="brand"
              />
              <Metric
                icon={Heart}
                label="Avg rent"
                value={formatPrice(averageOwnerRent)}
                tone="brand"
              />
            </>
          ) : (
            <>
              <Metric icon={Heart} label="Wishlist" value={savedIds.length} tone="brand" />
              <Metric
                icon={MessageCircle}
                label="Contacted owners"
                value={contactedIds.length}
                tone="success"
              />
              <Metric icon={Building2} label="Posted rooms" value={postedIds.length} tone="ink" />
              <Metric icon={ShieldCheck} label="Verified leads" value="24h" tone="brand" />
            </>
          )}
        </section>

        {isOwner && (
          <section className="mb-6 sm:mb-8 grid gap-4 sm:gap-5 lg:grid-cols-[1fr_360px]">
            <Panel title="Recent listed rooms">
              {ownerRooms.length ? (
                <div className="space-y-3">
                  {ownerRooms.slice(0, 4).map((room) => (
                    <Link
                      key={room.id}
                      to={`/rooms/${room.slug || room.id}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 sm:p-3 transition-colors hover:border-brand"
                    >
                      <img
                        src={room.coverImage}
                        alt=""
                        className="size-12 sm:size-16 shrink-0 rounded-lg object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs sm:text-sm font-black">{room.title}</span>
                        <span className="mt-0.5 sm:mt-1 block text-[10px] sm:text-xs font-bold text-slate-500">
                          {room.location}
                        </span>
                      </span>
                      <span className="text-xs sm:text-sm font-black text-brand">
                        {formatPrice(room.price)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Your posted rooms will appear here after you publish a listing.
                </p>
              )}
            </Panel>
            <Panel title="Owner actions">
              <div className="grid gap-2 sm:gap-3">
                <Link
                  to="/my-rooms"
                  className="inline-flex h-10 sm:h-11 items-center justify-center rounded-full bg-ink px-4 sm:px-5 text-xs sm:text-sm font-black text-white"
                >
                  Manage listings
                </Link>
                <Link
                  to="/list-room"
                  className="inline-flex h-10 sm:h-11 items-center justify-center rounded-full border border-slate-200 px-4 sm:px-5 text-xs sm:text-sm font-black text-ink hover:border-brand hover:text-brand"
                >
                  Add room
                </Link>
              </div>
            </Panel>
          </section>
        )}

        <section className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black">Wishlist rooms</h2>
              <Link to="/find-room" className="text-xs sm:text-sm font-black text-brand">
                Find more
              </Link>
            </div>
            {savedRooms.length ? (
              <div className="grid gap-3 sm:gap-5 sm:grid-cols-2">
                {savedRooms.map((room, index) => (
                  <RoomCard key={room.id} room={room} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved rooms yet"
                body="Tap Wishlist on any listing to keep it here for quick comparison."
                cta="Browse rooms"
                to="/find-room"
              />
            )}
          </div>

          <aside className="space-y-4 sm:space-y-5">
            <Panel title="Contacted owners">
              {contactedRooms.length ? (
                <div className="space-y-2 sm:space-y-3">
                  {contactedRooms.map((room) => (
                    <Link
                      key={room.id}
                      to={`/rooms/${room.slug || room.id}`}
                      className="block rounded-xl border border-slate-200 bg-card p-3 sm:p-4 transition-colors hover:border-brand"
                    >
                      <p className="text-sm sm:text-base font-black">{room.title}</p>
                      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-500">{room.owner.name}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500">
                  WhatsApp contacts will appear here after you message an owner.
                </p>
              )}
            </Panel>

            <Panel title="Owner checklist">
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm font-bold text-slate-600">
                <li>Upload 3+ clear photos</li>
                <li>Keep city, address, and landmark searchable</li>
                <li>Keep availability updated</li>
                <li>Verify identity for trust badge</li>
              </ul>
            </Panel>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "ink"
        ? "bg-ink/10 text-ink"
        : "bg-brand-soft text-brand";

  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-card p-3 sm:p-5">
      <span className={`mb-2 sm:mb-4 flex size-8 sm:size-10 items-center justify-center rounded-lg sm:rounded-xl ${toneClass}`}>
        <Icon className="size-4 sm:size-5" />
      </span>
      <p className="text-lg sm:text-2xl font-black">{value}</p>
      <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl sm:rounded-2xl border border-slate-200 bg-card p-4 sm:p-5">
      <h2 className="mb-3 sm:mb-4 text-sm sm:text-base font-black">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ title, body, cta, to }) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-200 bg-card p-5 sm:p-8 text-center">
      <h3 className="text-sm sm:text-base font-black">{title}</h3>
      <p className="mx-auto mt-1.5 sm:mt-2 max-w-md text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500">{body}</p>
      <Link
        to={to}
        className="mt-4 sm:mt-5 inline-flex rounded-full bg-brand px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-brand-foreground"
      >
        {cta}
      </Link>
    </div>
  );
}
