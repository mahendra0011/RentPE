import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  GraduationCap,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import AnimatedCounter from "@/components/reactbits/AnimatedCounter.jsx";
import ElectricBorder from "@/components/reactbits/ElectricBorder.jsx";
import InfiniteTicker from "@/components/reactbits/InfiniteTicker.jsx";
import SpotlightPanel from "@/components/reactbits/SpotlightPanel.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { getCityFromStorage, getCityOption } from "@/lib/listingMeta.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};
const heroStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};
const heroSignals = [
  "0% brokerage",
  "Verified rooms",
  "WhatsApp owners",
  "No map clutter",
  "Student friendly",
  "Owner direct",
];

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Search by keyword",
    body: "Type any city, area, college, office, or landmark keyword and compare matching rooms.",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Verified listings",
    body: "Every owner is identity-verified. Filter by gender, budget, amenities and room type.",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Connect directly",
    body: "Chat on WhatsApp or call. Visit, finalize and move in with no middleman.",
  },
];

const discoveryCards = [
  {
    icon: GraduationCap,
    title: "Student PGs",
    body: "Budget rooms near colleges, coaching hubs, and libraries.",
    meta: "Girls, boys, and co-ed options",
  },
  {
    icon: BriefcaseBusiness,
    title: "Working stays",
    body: "Quiet rooms near offices with commute-friendly locations.",
    meta: "WiFi, parking, and furnished filters",
  },
  {
    icon: Building2,
    title: "Private flats",
    body: "Independent rooms and 1BHK flats for more privacy.",
    meta: "Direct owner contact",
  },
  {
    icon: ShieldCheck,
    title: "Verified leads",
    body: "Cleaner listings with report controls and owner checks.",
    meta: "No brokerage pressure",
  },
];

const shortlistSignals = [
  "Budget fit",
  "Verified owner",
  "Direct WhatsApp",
  "Amenities match",
  "Privacy choice",
  "No brokerage",
];

const matchCards = [
  {
    icon: Search,
    title: "Budget match",
    body: "See rooms that fit your rent range, furnished needs, tenant type, and amenities.",
    score: 92,
  },
  {
    icon: ShieldCheck,
    title: "Trust match",
    body: "Prefer verified owners, clear photos, report controls, and safer direct contact.",
    score: 88,
  },
  {
    icon: MessageCircle,
    title: "Contact match",
    body: "Shortlist rooms where the owner is ready for WhatsApp or call follow-up.",
    score: 96,
  },
];

const shortlistStats = [
  { value: 3, suffix: "x", label: "faster shortlist" },
  { value: 0, suffix: "%", label: "brokerage" },
  { value: 24, suffix: "h", label: "lead window" },
];

export default function Home() {
  const [opened, setOpened] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const apiRooms = useSelector((state) => state.rooms.items);
  const selectedCityOption = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return getCityOption(params.get("city") ?? getCityFromStorage());
  }, [location.search]);
  const selectedCity = selectedCityOption.city;
  const fallbackRooms = useMemo(() => normalizeRooms(staticRooms), []);
  const sourceRooms = apiRooms.length ? apiRooms : fallbackRooms;
  const rooms = useMemo(() => {
    if (!selectedCity) return sourceRooms;

    const city = selectedCity.toLowerCase();
    return sourceRooms.filter((room) => String(room.city || "").toLowerCase() === city);
  }, [selectedCity, sourceRooms]);
  const previewRooms = rooms.slice(0, 3);
  const filterLink = `/find-room?${new URLSearchParams({
    ...(selectedCity ? { city: selectedCity } : {}),
    filters: "1",
  }).toString()}`;
  const seeAllLink = `/find-room?${new URLSearchParams({
    ...(selectedCity ? { city: selectedCity } : {}),
    all: "1",
  }).toString()}`;
  const selectedCityLabel = selectedCityOption.city ? selectedCityOption.city : "any city";
  const listingsTitle = selectedCity ? `Rooms in ${selectedCity}` : "Rooms matching your move";
  const listingsSubtitle = selectedCity
    ? `Showing rooms around ${selectedCityOption.shortLabel || selectedCity}`
    : "Search by city, area, landmark, title, or owner-posted address";

  useEffect(() => {
    dispatch(fetchRooms(selectedCity ? { city: selectedCity } : {}));
  }, [dispatch, selectedCity]);

  useEffect(() => {
    function openHashTarget() {
      const targetId = window.location.hash.slice(1);
      if (!targetId) return;

      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      });
    }

    openHashTarget();
    window.addEventListener("hashchange", openHashTarget);

    return () => window.removeEventListener("hashchange", openHashTarget);
  }, []);

  function onSearch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") || "").trim();
    const budget = form.get("budget");
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (budget) params.set("budget", String(budget));
    if (selectedCity) params.set("city", selectedCity);
    navigate(`/find-room${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24">
          <motion.div initial="hidden" animate="visible" variants={heroStagger}>
            <motion.h1
              variants={fadeUp}
              className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl lg:text-[64px]"
            >
              Your perfect room in <span className="text-brand">{selectedCityLabel}.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600"
            >
              The smartest way for students and migrants to find PGs, flats, and private rooms near
              colleges or offices. Zero brokerage, direct owner contact.
            </motion.p>

            <motion.form
              onSubmit={onSearch}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="animate-soft-pulse mx-auto mt-10 max-w-[760px] rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-32px_rgba(79,70,229,0.55)] md:rounded-full"
            >
              <div className="flex flex-col gap-2 md:h-14 md:flex-row md:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 md:px-5 md:py-0">
                  <Search className="size-5 shrink-0 text-slate-400" />
                  <input
                    name="query"
                    type="text"
                    placeholder="Search PG, hostel, flat, WiFi"
                    className="w-full bg-transparent text-sm font-black text-ink outline-none placeholder:text-slate-400"
                  />
                </label>
                <div className="hidden h-8 w-px bg-slate-200 md:block" />
                <label className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-0">
                  <select
                    name="budget"
                    className="bg-transparent text-sm font-black text-slate-600 outline-none"
                    aria-label="Budget"
                  >
                    <option value="">Any Budget</option>
                    <option value="5000">Under ₹5,000</option>
                    <option value="10000">₹5k - ₹10k</option>
                    <option value="20000">₹10k - ₹20k</option>
                  </select>
                </label>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="animate-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-black text-brand-foreground shadow-lg shadow-brand/30 transition-transform active:scale-95 md:h-full"
                >
                  <Search className="size-4" />
                  Search
                </motion.button>
              </div>
            </motion.form>

            <motion.div variants={fadeUp}>
              <InfiniteTicker
                items={heroSignals}
                duration={18}
                className="mx-auto mt-8 max-w-3xl"
                itemClassName="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm"
              />
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          id="listings"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6"
        >
          <motion.div variants={fadeUp} className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-ink">{listingsTitle}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{listingsSubtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={filterLink}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand"
              >
                <SlidersHorizontal className="size-4" />
                Filter
              </Link>
              <Link
                to={seeAllLink}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
              >
                See all
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div layout className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {previewRooms.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
            {previewRooms.length === 0 && (
              <div className="col-span-full rounded-[22px] border border-dashed border-slate-200 bg-white py-14 text-center">
                <p className="font-black text-ink">
                  {selectedCity
                    ? `No rooms available in ${selectedCity} yet`
                    : "No rooms available yet"}
                </p>
              </div>
            )}
          </motion.div>
        </motion.section>

        <motion.section
          id="how"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 md:py-16"
        >
          <ElectricBorder
            color="#7df9ff"
            speed={0.8}
            chaos={0.06}
            thickness={2}
            borderRadius={28}
            style={{ borderRadius: 28 }}
          >
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm md:p-10">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -left-32 -top-32 size-96 rounded-full bg-gradient-to-br from-brand/8 to-purple-400/5 blur-3xl" />
                <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-gradient-to-tl from-brand/8 to-cyan-400/5 blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="mb-12 text-center">
                  <span className="mb-4 inline-flex rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
                    How it Works
                  </span>
                  <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl">
                    Find or list a room in <span className="text-brand">three simple steps.</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
                    Search by keyword, compare verified listings, and connect directly with owners.
                    No brokers. No spam.
                  </p>
                </div>

                <div className="relative grid gap-6 md:grid-cols-3">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-[15%] top-[52px] hidden md:block"
                  >
                    <div className="h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
                  </div>

                  {steps.map((step, index) => (
                    <motion.article
                      key={step.title}
                      initial={{ opacity: 0, y: 24, scale: 0.96 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, amount: 0.35 }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
                      className="group relative rounded-[20px] border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg hover:shadow-brand/5"
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute right-4 top-3 select-none text-[2.5rem] font-black leading-none text-slate-200/60 transition-colors group-hover:text-brand/[0.07]"
                      >
                        {step.number}
                      </span>

                      <span className="animate-glow-pulse mb-6 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-purple-600 text-white shadow-md shadow-brand/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-brand/30">
                        <step.icon className="size-5" />
                      </span>
                      <h3 className="relative z-10 text-base font-black text-ink">{step.title}</h3>
                      <p className="relative z-10 mt-2 text-sm font-medium leading-6 text-slate-600">
                        {step.body}
                      </p>
                    </motion.article>
                  ))}
                </div>

                <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    to="/find-room"
                    className="animate-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-purple-600 px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-transform hover:-translate-y-0.5 active:scale-95"
                  >
                    Browse rooms
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/signup?owner=1"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-7 text-sm font-black text-ink transition-all hover:border-brand/30 hover:text-brand active:scale-95"
                  >
                    List your room
                  </Link>
                </div>
              </div>
            </div>
          </ElectricBorder>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-12 size-72 rounded-full bg-gradient-to-br from-brand/5 to-purple-400/5 blur-3xl" />
            <div className="absolute -right-24 bottom-12 size-72 rounded-full bg-gradient-to-tl from-cyan-400/5 to-brand/5 blur-3xl" />
          </div>

          <div className="relative">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wider text-brand"
                >
                  <span className="size-1.5 rounded-full bg-brand" />
                  Find your fit
                </motion.span>
                <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl">
                  Start with the stay type that{" "}
                  <span className="bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                    matches your move.
                  </span>
                </h2>
              </div>
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="max-w-sm text-sm font-medium leading-6 text-slate-500"
              >
                Whether you're joining college, starting a job, or shifting cities — RentPE keeps
                the first decision simple.
              </motion.p>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              {discoveryCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  whileHover={{ y: -8 }}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-brand/20 hover:shadow-xl hover:shadow-brand/5"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-purple-500/10 text-brand transition-all duration-300 group-hover:from-brand group-hover:to-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand/20">
                      <card.icon className="size-5" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors group-hover:text-brand/40">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-ink transition-colors group-hover:text-brand">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{card.body}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 transition-colors group-hover:text-brand/60">
                    <span className="size-1 rounded-full bg-slate-300 group-hover:bg-brand/40" />
                    {card.meta}
                  </div>
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-brand to-purple-500 transition-transform duration-300 group-hover:scale-x-100"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
          <SpotlightPanel className="bg-white text-ink">
            <div className="grid overflow-hidden rounded-[28px] md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative overflow-hidden p-7 md:p-10">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-20 -top-20 size-72 rounded-full bg-gradient-to-br from-brand/8 to-purple-400/5 blur-3xl" />
                </div>

                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
                    <span className="size-1.5 rounded-full bg-brand" />
                    Smart shortlist
                  </span>
                  <h2 className="mt-5 max-w-lg text-3xl font-black leading-tight tracking-normal md:text-4xl">
                    Choose rooms with{" "}
                    <span className="bg-gradient-to-r from-brand to-purple-500 bg-clip-text text-transparent">
                      cleaner match signals.
                    </span>
                  </h2>
                  <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-slate-600">
                    Compare rent, trust, amenities, and owner contact in one calm flow before you
                    spend time calling or visiting.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {shortlistStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-[18px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <p className="text-3xl font-black text-brand">
                          <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                        </p>
                        <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <InfiniteTicker
                    items={shortlistSignals}
                    duration={18}
                    className="mt-8 max-w-lg"
                    itemClassName="rounded-full border border-brand/20 bg-brand-soft/50 px-3 py-1.5 text-[11px] font-black text-brand"
                  />
                </div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#07111f] to-[#0d1a30] p-5 text-white md:p-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="relative z-10">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Match board
                      </p>
                      <h3 className="mt-1 text-xl font-black tracking-normal">
                        Before you contact owner
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
                      Live filters
                    </span>
                  </div>

                  <div className="grid gap-4">
                    {matchCards.map((card, index) => (
                      <motion.article
                        key={card.title}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.45 }}
                        transition={{ duration: 0.35, delay: index * 0.08 }}
                        className="group rounded-[20px] border border-white/[0.08] bg-white/[0.06] p-5 backdrop-blur transition-all hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="flex items-start gap-4">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/40 to-purple-500/30 text-indigo-200 shadow-lg shadow-brand/10 transition-transform duration-300 group-hover:scale-110">
                            <card.icon className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-black text-white">{card.title}</h4>
                              <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-sm font-black text-transparent">
                                {card.score}%
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                              {card.body}
                            </p>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${card.score}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.9, delay: 0.2 + index * 0.12 }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SpotlightPanel>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-32 top-12 size-80 rounded-full bg-gradient-to-br from-brand/[0.04] to-purple-400/[0.04] blur-3xl" />
            <div className="absolute -bottom-20 right-0 size-96 rounded-full bg-gradient-to-tl from-cyan-400/[0.04] to-brand/[0.04] blur-3xl" />
          </div>

          <div className="relative grid gap-6 md:grid-cols-[1.85fr_0.9fr]">
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-20 size-48 rounded-full bg-gradient-to-br from-brand/[0.06] to-purple-400/[0.04] blur-2xl transition-all duration-500 group-hover:scale-150" />
                <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-gradient-to-tr from-cyan-400/[0.04] to-brand/[0.06] blur-2xl transition-all duration-500 group-hover:scale-150" />
              </div>

              <div className="relative p-8 md:p-12">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-purple-600 text-white shadow-md shadow-brand/20">
                    <Building2 className="size-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
                    <span className="size-1.5 rounded-full bg-brand" />
                    For Owners
                  </span>
                </div>

                <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink md:text-4xl">
                  Empty room? Earn upto{" "}
                  <span className="bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                    ₹15,000/mo.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-600">
                  List your PG, flat or single room in 2 minutes. Get verified leads from real
                  tenants and working professionals.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: ShieldCheck, text: "Verified tenants only" },
                    { icon: MessageCircle, text: "Direct WhatsApp connect" },
                    { icon: Search, text: "Free listing — zero cost" },
                  ].map((item) => (
                    <div
                      key={item.text}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <item.icon className="size-3.5" />
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">{item.text}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/signup?owner=1"
                  className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-purple-600 px-8 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/30 active:scale-95"
                >
                  List Property — It's Free
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-brand to-purple-700 p-8 text-white shadow-lg md:p-10"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-16 -top-16 size-40 rounded-full bg-white/[0.06] blur-xl" />
                <div className="absolute -bottom-16 -left-16 size-40 rounded-full bg-white/[0.04] blur-xl" />
              </div>

              <div className="relative">
                <p className="text-5xl font-black tracking-tight">15k+</p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-white/70">
                  Verified rooms across 24 Indian cities
                </p>
              </div>

              <div className="my-8 h-px bg-white/10" />

              <div className="relative">
                <p className="text-5xl font-black tracking-tight">0%</p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-white/70">
                  Brokerage. Forever.
                </p>
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-bold leading-5 text-white/60">
                  "Listed my room on RentPE and got 3 genuine leads in 24 hours."
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-white/40">
                  — Rajesh, Bhopal
                </p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Reviews ── */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-28 top-12 size-64 rounded-full bg-gradient-to-br from-amber-400/[0.05] to-brand/[0.05] blur-3xl" />
            <div className="absolute -right-28 bottom-12 size-64 rounded-full bg-gradient-to-tl from-brand/[0.05] to-amber-400/[0.05] blur-3xl" />
          </div>

          <div className="relative">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Real Stories
                </motion.span>
                <h2 className="text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl">
                  Loved by{" "}
                  <span className="bg-gradient-to-r from-amber-500 to-brand bg-clip-text text-transparent">
                    tenants & owners
                  </span>
                </h2>
              </div>
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="max-w-sm text-sm font-medium leading-6 text-slate-500"
              >
                Real experiences from people who found their perfect stay on RentPE.
              </motion.p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                {
                  name: "Ananya Sharma",
                  role: "Student, IIIT Bhopal",
                  avatar: "AS",
                  rating: 5,
                  text: "I was nervous moving to a new city for college. RentPE made finding a PG near campus super easy — no brokers, no fake listings. I moved in within 3 days of landing.",
                  tag: "Tenant",
                },
                {
                  name: "Vikram Mehta",
                  role: "Software Engineer, Pune",
                  avatar: "VM",
                  rating: 5,
                  text: "Switched jobs and needed a flat in Pune fast. The WhatsApp connect feature is a lifesaver — directly spoke to owners, saw the place, and closed the deal in one weekend.",
                  tag: "Tenant",
                },
                {
                  name: "Priya Patel",
                  role: "Owner, Bhopal",
                  avatar: "PP",
                  rating: 5,
                  text: "Listed my two PGs and got genuine leads within hours. No more dealing with time-wasting brokers. The tenants I got were all verified professionals. Highly recommend!",
                  tag: "Owner",
                },
                {
                  name: "Rohit Singh",
                  role: "Designer, Remote",
                  avatar: "RS",
                  rating: 5,
                  text: "RentPE is the first platform that actually understood what migrants need. The filters are spot-on, listings are genuine, and the whole experience feels built for us.",
                  tag: "Tenant",
                },
              ].map((review, i) => (
                <motion.div
                  key={review.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="group relative rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/40 hover:shadow-lg hover:shadow-amber-500/5"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-[13px] font-black text-white shadow-sm">
                        {review.avatar}
                      </span>
                      <div>
                        <p className="text-sm font-black text-ink">{review.name}</p>
                        <p className="text-[11px] font-bold text-slate-400">{review.role}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200/50 bg-amber-50/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-600">
                      {review.tag}
                    </span>
                  </div>

                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: review.rating }, (_, s) => (
                      <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm font-medium leading-6 text-slate-600">"{review.text}"</p>

                  <div className="absolute inset-x-6 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-amber-400 to-brand transition-transform duration-300 group-hover:scale-x-100" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/3 top-12 size-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-brand/[0.03] to-purple-400/[0.03] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wider text-brand"
              >
                <span className="size-1.5 rounded-full bg-brand" />
                Got questions?
              </motion.span>
              <h2 className="text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl">
                Frequently asked{" "}
                <span className="bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                  questions
                </span>
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                Everything you need to know about renting with RentPE.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "Is RentPE free for tenants?",
                  a: "Yes, completely free. Tenants can browse, shortlist, and connect with owners without paying anything. No hidden charges, no subscription fees — ever.",
                },
                {
                  q: "How do I list my property?",
                  a: 'Click the "List Property" button on our home page or sign up as an owner. Fill in details about your property — location, rent, photos, amenities — and publish it in under 2 minutes. Our team reviews it within a few hours.',
                },
                {
                  q: "Can I switch from tenant to owner?",
                  a: "Absolutely. One account works for both roles. Just head to your dashboard and you can list a property right away — no need to create a separate account.",
                },
                {
                  q: "What cities does RentPE cover?",
                  a: "We currently operate across almost every city in India including Bhopal, Pune, Bangalore, Hyderabad, Delhi-NCR, Indore, Mumbai, Chennai, and more. New cities are added every month.",
                },
                {
                  q: "How do I contact the owner?",
                  a: "Once you find a listing you like, hit the WhatsApp button or use the in-app chat. You'll be connected directly with the property owner to discuss details, schedule a visit, or close the deal.",
                },
                {
                  q: "Can I schedule a visit before paying?",
                  a: "Yes. You can request a visit directly from the listing page. The owner gets notified and can confirm a time. No payment is needed to visit a property.",
                },
                {
                  q: "Is my personal information safe?",
                  a: "We take privacy seriously. Your contact details are never shared publicly. Conversations happen through our platform, and you control what information you share with owners.",
                },
                {
                  q: "What documents do I need to rent?",
                  a: "Most owners ask for basic ID proof (Aadhaar, PAN, or Passport), along with a rental agreement. Some may request a security deposit equivalent to 1–2 months of rent.",
                },
              ].map((faq, i) => {
                const open = opened === i;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm transition-all duration-300"
                  >
                    <button
                      onClick={() => setOpened(open ? null : i)}
                      className="flex w-full items-center justify-between px-6 py-5 text-left"
                    >
                      <span className="text-sm font-black text-ink">{faq.q}</span>
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors"
                      >
                        <ChevronDown className="size-3.5" />
                      </motion.span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: open ? "auto" : 0,
                        opacity: open ? 1 : 0,
                      }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-slate-100 px-6 pb-5 pt-4 text-sm font-medium leading-6 text-slate-500">
                        {faq.a}
                      </p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
                <MapPin className="size-4" />
              </span>
              <span className="text-lg font-black text-ink">RentPE</span>
            </Link>
            <p className="mt-5 max-w-md text-sm font-medium leading-6 text-slate-500">
              Modern housing for India's students, interns and migrants. Find a room you'll actually
              want to call home.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-sm">
            <FooterColumn title="Discover" links={["Bhopal", "Pune", "Bangalore"]} />
            <FooterColumn title="Platform" links={["How it Works", "Trust & Safety"]} />
            <FooterColumn title="Support" links={["Help Center", "Contact"]} />
          </div>
        </div>
        <p className="border-t border-slate-100 py-6 text-center text-xs font-bold text-slate-400">
          (c) 2026 RentPE India. Made for the modern nomad.
        </p>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="mb-4 text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link}
            to={link === "How it Works" ? "/#how" : "/#listings"}
            className="block font-bold text-slate-500 hover:text-brand"
          >
            {link}
          </Link>
        ))}
      </div>
    </div>
  );
}
