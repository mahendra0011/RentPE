import { Building2, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { items, savedIds, contactedIds, postedIds } = useSelector((state) => state.rooms);
  const rooms = items.length ? items : normalizeRooms(staticRooms);
  const savedRooms = rooms.filter((room) => savedIds.includes(room.id));
  const contactedRooms = rooms.filter((room) => contactedIds.includes(room.id));

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
              User dashboard
            </span>
            <h1 className="text-3xl font-black tracking-normal md:text-4xl">
              Your RoomRadar activity
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track saved rooms, contacted owners, and properties you have posted.
            </p>
          </div>
          <Link
            to="/list-room"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-background"
          >
            <Building2 className="size-4" />
            Post room
          </Link>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <Metric icon={Heart} label="Saved rooms" value={savedIds.length} tone="brand" />
          <Metric
            icon={MessageCircle}
            label="Contacted owners"
            value={contactedIds.length}
            tone="success"
          />
          <Metric icon={Building2} label="Posted rooms" value={postedIds.length} tone="ink" />
          <Metric icon={ShieldCheck} label="Verified leads" value="24h" tone="brand" />
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Saved rooms</h2>
              <Link to="/#listings" className="text-sm font-black text-brand">
                Find more
              </Link>
            </div>
            {savedRooms.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {savedRooms.map((room, index) => (
                  <RoomCard key={room.id} room={room} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved rooms yet"
                body="Tap the heart icon on any listing to keep it here for quick comparison."
                cta="Browse rooms"
                to="/#listings"
              />
            )}
          </div>

          <aside className="space-y-5">
            <Panel title="Contacted owners">
              {contactedRooms.length ? (
                <div className="space-y-3">
                  {contactedRooms.map((room) => (
                    <Link
                      key={room.id}
                      to={`/rooms/${room.slug || room.id}`}
                      className="block rounded-xl border border-slate-200 bg-card p-4 transition-colors hover:border-brand"
                    >
                      <p className="font-black">{room.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{room.owner.name}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  WhatsApp contacts will appear here after you message an owner.
                </p>
              )}
            </Panel>

            <Panel title="Owner checklist">
              <ul className="space-y-3 text-sm font-bold text-slate-600">
                <li>Upload 3+ clear photos</li>
                <li>Use exact landmark for geocoding</li>
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
    <div className="rounded-2xl border border-slate-200 bg-card p-5">
      <span className={`mb-4 flex size-10 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="size-5" />
      </span>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-card p-5">
      <h2 className="mb-4 font-black">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ title, body, cta, to }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-card p-8 text-center">
      <h3 className="font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>
      <Link
        to={to}
        className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-black text-brand-foreground"
      >
        {cta}
      </Link>
    </div>
  );
}
