import { motion } from "framer-motion";
import { Check, Heart, MapPin, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import RatingStars from "@/components/RatingStars.jsx";
import { formatPrice } from "@/lib/format.js";
import { shareRoom } from "@/lib/share.js";
import { markContacted, toggleSavedRoom } from "@/store/roomsSlice.js";

export default function RoomCard({ room, index = 0, onHover, highlighted = false }) {
  const dispatch = useDispatch();
  const saved = useSelector((state) => state.rooms.savedIds.includes(room.id));
  const [shareState, setShareState] = useState("");

  async function handleShare() {
    try {
      const result = await shareRoom(room);
      setShareState(result === "copied" ? "Copied" : "Shared");
      window.setTimeout(() => setShareState(""), 1600);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setShareState("Try again");
        window.setTimeout(() => setShareState(""), 1600);
      }
    }
  }

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
            <RatingStars
              rating={room.owner?.rating}
              reviewCount={room.owner?.reviewCount}
              size="xs"
              className="mt-1.5"
              labelClassName="text-[10px] font-black text-slate-400"
            />
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

      <div className="mt-4 grid gap-2 px-1 pb-1">
        <a
          href={`https://wa.me/${room.owner.phone}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => dispatch(markContacted(room.id))}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-success px-3 py-2.5 text-xs font-black text-success-foreground transition-colors hover:bg-success/90"
        >
          <MessageCircle className="size-3.5" />
          WhatsApp Owner
        </a>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            onClick={handleShare}
            aria-label={`Share ${room.title}`}
            whileTap={{ scale: 0.92 }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition-colors hover:border-brand hover:text-brand"
          >
            {shareState ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
            {shareState || "Share"}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => dispatch(toggleSavedRoom(room.id))}
            aria-label={
              saved ? `Remove ${room.title} from wishlist` : `Add ${room.title} to wishlist`
            }
            whileTap={{ scale: 0.9 }}
            animate={saved ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.24 }}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-black transition-colors ${
              saved
                ? "border-brand bg-brand-soft text-brand"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand"
            }`}
          >
            <Heart className={`size-3.5 ${saved ? "fill-brand" : ""}`} />
            {saved ? "Saved" : "Wishlist"}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
