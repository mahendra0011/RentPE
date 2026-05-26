import { ArrowRight, Heart } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

export default function Wishlist() {
  const dispatch = useDispatch();
  const { items, savedIds } = useSelector((state) => state.rooms);
  const rooms = items.length ? items : normalizeRooms(staticRooms);
  const savedRooms = rooms.filter((room) => savedIds.includes(room.id));

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
              <Heart className="size-3.5 fill-brand" />
              Wishlist
            </span>
            <h1 className="text-3xl font-black tracking-normal text-ink md:text-4xl">
              Rooms you saved for later.
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Keep your shortlist clean, compare rents faster, and share the best rooms before you
              contact the owner.
            </p>
          </div>
          <Link
            to="/find-room"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition-colors hover:bg-slate-800"
          >
            Find more rooms
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {savedRooms.length ? (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {savedRooms.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Heart className="size-5" />
            </span>
            <h2 className="mt-5 text-xl font-black text-ink">No wishlist rooms yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
              Tap `Wishlist` on any room card to save it here.
            </p>
            <Link
              to="/find-room"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-black text-white"
            >
              Browse rooms
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
