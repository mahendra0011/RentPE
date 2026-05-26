import { motion } from "framer-motion";
import { Heart, MapPin, MessageCircle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { formatPrice } from "@/lib/format.js";
import { markContacted, toggleSavedRoom } from "@/store/roomsSlice.js";

export default function RoomCard({ room, index = 0, onHover, highlighted = false }) {
  const dispatch = useDispatch();
  const saved = useSelector((state) => state.rooms.savedIds.includes(room.id));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.995 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        delay: index * 0.04,
        duration: 0.38,
        type: "spring",
        stiffness: 240,
        damping: 24,
      }}
      onMouseEnter={() => onHover?.(room.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group rounded-[20px] border bg-card p-3 transition-shadow hover:shadow-[var(--shadow-card)] ${
        highlighted ? "border-brand shadow-[var(--shadow-card)]" : "border-slate-200"
      }`}
    >
      <Link to={`/rooms/${room.slug || room.id}`} className="block">
        <div className="relative mb-4 overflow-hidden rounded-[16px] bg-slate-100">
          <img
            src={room.coverImage || room.images[0]}
            alt={room.title}
            className="aspect-[1.32] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-ink shadow-sm backdrop-blur">
            {room.tag}
          </span>
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-ink/80 px-2 py-1 text-xs font-bold text-background backdrop-blur-sm">
            <MapPin className="size-3" />
            {room.distance}
          </span>
          {room.availability === "occupied" && (
            <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              Occupied
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-black text-ink">{room.title}</h3>
            <p className="mt-1 truncate text-xs text-slate-500">{room.location}</p>
          </div>
          <span className="whitespace-nowrap text-lg font-black text-brand">
            {formatPrice(room.price)}
            <span className="ml-1 text-[10px] font-black uppercase text-slate-300">/mo</span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 px-1">
          {room.amenities.slice(0, 3).map((amenity) => (
            <span
              key={amenity}
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
            >
              {amenity}
            </span>
          ))}
        </div>
      </Link>

      <div className="mt-4 flex gap-2 px-1 pb-1">
        <a
          href={`https://wa.me/${room.owner.phone}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => dispatch(markContacted(room.id))}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2.5 text-xs font-black text-success-foreground transition-colors hover:bg-success/90"
        >
          <MessageCircle className="size-3.5" />
          WhatsApp Owner
        </a>
        <motion.button
          type="button"
          onClick={() => dispatch(toggleSavedRoom(room.id))}
          aria-label="Save room"
          whileTap={{ scale: 0.86 }}
          animate={saved ? { scale: [1, 1.16, 1] } : { scale: 1 }}
          transition={{ duration: 0.24 }}
          className={`inline-flex size-10 items-center justify-center rounded-full border transition-colors hover:bg-slate-50 ${
            saved ? "border-brand bg-brand-soft" : "border-slate-200"
          }`}
        >
          <Heart className={`size-4 ${saved ? "fill-brand text-brand" : "text-slate-500"}`} />
        </motion.button>
      </div>
    </motion.article>
  );
}
