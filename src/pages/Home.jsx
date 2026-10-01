import { motion } from "framer-motion";
import {
  Armchair,
  ArrowRight,
  Ban,
  BriefcaseBusiness,
  Building,
  Building2,
  ChevronDown,
  Clock,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  IndianRupee,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Quote,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import AnimatedCounter from "@/components/reactbits/AnimatedCounter.jsx";
import InfiniteTicker from "@/components/reactbits/InfiniteTicker.jsx";
import ShinyText from "@/components/reactbits/ShinyText.jsx";
import SpotlightPanel from "@/components/reactbits/SpotlightPanel.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import heroBg from "@/assets/hero-bg.png";
import heroIllustration from "@/assets/hero-illustration.png";
import stepSearchImg from "@/assets/step-search.png";
import stepVerifiedImg from "@/assets/step-verified.png";
import stepConnectImg from "@/assets/step-connect.png";
import fitStudentPgs from "@/assets/fit-student-pgs.png";
import fitWorkingStays from "@/assets/fit-working-stays.png";
import fitPrivateFlats from "@/assets/fit-private-flats.png";
import fitVerifiedLeads from "@/assets/fit-verified-leads.png";
import smartChoicelistImg from "@/assets/smart-choicelist.png";
import forOwnersBannerImg from "@/assets/for-owners-banner.png";
import { rooms as staticRooms } from "@/data/rooms.js";
import { getCityFromStorage, getCityOption } from "@/lib/listingMeta.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { useUserLocation } from "@/hooks/useUserLocation.js";
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
  "Direct in-app chat",
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
    body: "Chat directly in-app or call. Visit, finalize and move in with no middleman.",
  },
];

const discoveryCards = [
  {
    icon: GraduationCap,
    img: fitStudentPgs,
    title: "Student PGs",
    body: "Budget rooms near colleges, coaching hubs, and libraries.",
    meta: "Girls, boys, and co-ed options",
    num: "01",
    badgeColor: "bg-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30",
    checkColor: "text-emerald-500",
  },
  {
    icon: BriefcaseBusiness,
    img: fitWorkingStays,
    title: "Working stays",
    body: "Quiet rooms near offices with commute-friendly locations.",
    meta: "WiFi, parking, and furnished filters",
    num: "02",
    badgeColor: "bg-blue-500",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-900/30",
    checkColor: "text-blue-500",
  },
  {
    icon: Building2,
    img: fitPrivateFlats,
    title: "Private flats",
    body: "Independent rooms and 1BHK flats for more privacy.",
    meta: "Direct owner contact",
    num: "03",
    badgeColor: "bg-brand",
    iconBg: "bg-brand/10 text-brand dark:bg-brand/20",
    checkColor: "text-brand",
  },
  {
    icon: ShieldCheck,
    img: fitVerifiedLeads,
    title: "Verified leads",
    body: "Cleaner listings with report controls and owner checks.",
    meta: "No brokerage pressure",
    num: "04",
    badgeColor: "bg-amber-500",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-900/30",
    checkColor: "text-emerald-500",
  },
];

const choicelistStats = [
  {
    icon: Zap,
    value: 3,
    suffix: "x",
    label: "faster shortlist",
  },
  {
    icon: ShieldCheck,
    value: 0,
    suffix: "%",
    label: "brokerage",
  },
  {
    icon: Clock,
    value: 24,
    suffix: "h",
    label: "lead window",
  },
];

const choicelistFeatures = [
  {
    icon: IndianRupee,
    title: "Budget fit",
    body: "Rooms that fit your budget",
    iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    icon: ShieldCheck,
    title: "Verified owner",
    body: "Only identity-verified owners",
    iconBg: "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800",
  },
  {
    icon: MessageCircle,
    title: "Direct in-app chat",
    body: "Chat or connect directly with owners",
    iconBg: "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/40 dark:border-purple-800",
  },
  {
    icon: Armchair,
    title: "Amenities match",
    body: "Find rooms with must-have amenities",
    iconBg: "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800",
  },
  {
    icon: Lock,
    title: "Privacy choice",
    body: "Choose what to share, stay in control",
    iconBg: "bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-950/40 dark:border-teal-800",
  },
  {
    icon: Ban,
    title: "No brokerage",
    body: "Deal directly. Save extra charges",
    iconBg: "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800",
  },
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
  const { coordinates: userCoords } = useUserLocation(selectedCity);
  const baseRooms = apiRooms.length ? apiRooms : staticRooms;
  const sourceRooms = useMemo(() => normalizeRooms(baseRooms, userCoords), [baseRooms, userCoords]);
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
        <section className="relative overflow-hidden bg-white/50 px-4 pb-16 pt-12 text-left sm:px-6 md:pb-24 md:pt-16 lg:px-8 dark:bg-background">
          {/* Hero background ambient banner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
          >
            <img
              src={heroBg}
              alt=""
              className="size-full object-cover object-center opacity-100 dark:opacity-30"
            />
            {/* Soft gradient fade only at bottom edge */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroStagger}
              className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12"
            >
              {/* Left Column: Hero Content */}
              <div className="lg:col-span-7">
                <motion.div
                  variants={fadeUp}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand backdrop-blur-sm"
                >
                  <span className="size-2 rounded-full bg-brand animate-pulse" />
                  Verified Student & Working Professional Stays
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="text-4xl font-black leading-[1.15] tracking-tight text-ink sm:text-5xl lg:text-[58px]"
                >
                  Your perfect room in{" "}
                  <ShinyText
                    text={`${selectedCityLabel}.`}
                    color="var(--brand)"
                    speed={3}
                    spread={140}
                    direction="left"
                  />
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300 sm:text-lg"
                >
                  The smartest way for students and migrants to find PGs, flats, and private rooms
                  near colleges or offices. Zero brokerage, direct owner contact.
                </motion.p>

                <motion.form
                  onSubmit={onSearch}
                  variants={fadeUp}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="animate-soft-pulse mt-8 w-full max-w-xl rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_60px_-25px_rgba(79,70,229,0.35)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:rounded-full"
                >
                  <div className="flex flex-col gap-2 sm:h-14 sm:flex-row sm:items-center">
                    <label className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 sm:px-4 sm:py-0">
                      <Search className="size-4 shrink-0 text-slate-400" />
                      <input
                        name="query"
                        type="text"
                        placeholder="Search PG, hostel, flat, WiFi"
                        className="w-full bg-transparent text-sm font-black text-ink outline-none placeholder:text-slate-400"
                      />
                    </label>
                    <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                    <label className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-0">
                      <select
                        name="budget"
                        className="bg-transparent text-sm font-black text-slate-600 outline-none dark:text-slate-300"
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
                      className="animate-shimmer inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/30 transition-transform active:scale-95 sm:h-full sm:rounded-full"
                    >
                      <Search className="size-4" />
                      Search
                    </motion.button>
                  </div>
                </motion.form>

                <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-2">
                  {heroSignals.map((signal) => (
                    <span
                      key={signal}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                    >
                      <span className="size-1.5 rounded-full bg-brand" />
                      {signal}
                    </span>
                  ))}
                </motion.div>
              </div>

              {/* Right Column: Hero Room Illustration */}
              <div className="lg:col-span-5">
                <motion.div
                  variants={fadeUp}
                  className="relative mx-auto w-full max-w-md lg:max-w-none"
                >
                  <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <img
                      src={heroIllustration}
                      alt="Verified modern room with desk, bed, and city view"
                      className="w-full h-auto aspect-[4/3] object-cover transition-transform duration-500 hover:scale-[1.02]"
                    />

                    {/* Floating badge 1: Top-Right "100% Verified" */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3.5 py-1.5 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        100% Verified
                      </span>
                    </div>

                    {/* Floating badge 2: Bottom-Left "Direct Owner Chat" */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 p-2.5 pr-4 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-md shadow-brand/30">
                        <MessageCircle className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          Direct Owner Chat
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Zero Broker Fee
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        <motion.section
          id="listings"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8"
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
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.48 }}
          className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 md:py-20 lg:px-8"
        >
          {/* Header */}
          <div className="mb-12 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
              <Settings className="size-3.5" />
              How it Works
            </span>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl md:text-[42px]">
              Find or list a room in{" "}
              <span className="text-brand">three simple steps.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-500 dark:text-slate-400">
              Search by keyword, compare verified listings, and connect directly with owners.{" "}
              <strong className="text-ink dark:text-white">No brokers. No spam.</strong>
            </p>
          </div>

          {/* Step Cards */}
          <div className="relative grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            {/* Dashed arrow connectors (desktop only) */}
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
              {/* Arrow 1→2 */}
              <div className="absolute left-[33.33%] top-1/2 -translate-x-1/2 -translate-y-1/2">
                <svg width="48" height="12" viewBox="0 0 48 12" fill="none">
                  <line x1="0" y1="6" x2="36" y2="6" stroke="var(--brand)" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
                  <polygon points="36,1 46,6 36,11" fill="var(--brand)" />
                </svg>
              </div>
              {/* Arrow 2→3 */}
              <div className="absolute left-[66.66%] top-1/2 -translate-x-1/2 -translate-y-1/2">
                <svg width="48" height="12" viewBox="0 0 48 12" fill="none">
                  <line x1="0" y1="6" x2="36" y2="6" stroke="var(--brand)" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
                  <polygon points="36,1 46,6 36,11" fill="var(--brand)" />
                </svg>
              </div>
            </div>

            {[{
              num: 1,
              img: stepSearchImg,
              title: "Search by keyword",
              body: "Type any city, area, college, office, or landmark keyword and compare matching rooms.",
            }, {
              num: 2,
              img: stepVerifiedImg,
              title: "Verified listings",
              body: "Every owner is identity-verified. Filter by gender, budget, amenities and room type.",
            }, {
              num: 3,
              img: stepConnectImg,
              title: "Connect directly",
              body: "Chat directly in-app or call. Visit, finalize and move in with no middleman.",
            }].map((card, index) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.12, duration: 0.45, ease: "easeOut" }}
                className="group relative rounded-[22px] border border-slate-200/80 bg-white p-0 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Step number badge */}
                <span className="absolute -top-4 left-1/2 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-sm font-black text-white shadow-md shadow-brand/25">
                  {card.num}
                </span>

                {/* Illustration */}
                <div className="overflow-hidden rounded-t-[22px] bg-slate-50 dark:bg-slate-800/50">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                </div>

                {/* Text content */}
                <div className="p-6 text-center">
                  <h3 className="text-base font-black text-ink">{card.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    {card.body}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/find-room"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/20 transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <Search className="size-4" />
              Browse rooms
            </Link>
            <Link
              to="/signup?owner=1"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-brand/20 bg-white px-7 text-sm font-black text-brand transition-all hover:border-brand/40 active:scale-95 dark:border-brand/30 dark:bg-slate-900"
            >
              <HomeIcon className="size-4" />
              List your room
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.48 }}
          className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8"
        >
          {/* Header */}
          <div className="mb-12 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
              <Settings className="size-3.5" />
              Find your fit
            </span>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl md:text-[42px]">
              Start with the stay type that{" "}
              <span className="text-brand">matches your move.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-500 dark:text-slate-400">
              Whether you're joining college, starting a job, or shifting cities —{" "}
              <strong className="text-brand">RoomsFind</strong> keeps the first decision simple.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {discoveryCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Illustration */}
                <div className="bg-slate-50 dark:bg-slate-800/50">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-auto aspect-[4/3] object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className={`flex size-9 items-center justify-center rounded-full ${card.iconBg}`}>
                      <card.icon className="size-4" />
                    </span>
                    <h3 className="text-base font-black text-ink">{card.title}</h3>
                  </div>
                  <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    {card.body}
                  </p>

                  {/* Divider */}
                  <div className="my-4 h-px bg-slate-100 dark:bg-slate-800" />

                  {/* Meta tag */}
                  <div className="flex items-center gap-2">
                    <svg className={`size-4 shrink-0 ${card.checkColor}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {card.meta}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.48 }}
          className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8"
        >
          {/* Header */}
          <div className="mb-12 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-blue-50/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-400">
              <Sparkles className="size-3.5 fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400" />
              Smart Choicelist
            </span>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl md:text-[42px]">
              Choose rooms with{" "}
              <span className="text-blue-600 dark:text-blue-500">cleaner match signals.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-500 dark:text-slate-400">
              Compare rent, trust, amenities, and owner contact in one calm flow before you spend time calling or visiting.
            </p>
          </div>

          {/* Middle Row: 3D Illustration + 3 Stats */}
          <div className="mb-8 grid items-center gap-8 lg:grid-cols-12">
            {/* Left: 3D Illustration */}
            <div className="flex justify-center lg:col-span-5">
              <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-blue-100/80 bg-gradient-to-b from-blue-50/50 to-slate-50/20 p-2 shadow-sm dark:border-slate-800 dark:from-slate-900/50 dark:to-slate-900/20">
                <img
                  src={smartChoicelistImg}
                  alt="Smart Choicelist room matching"
                  className="h-auto w-full rounded-[22px] object-cover"
                />
              </div>
            </div>

            {/* Right: 3 Stat Cards in a row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
              {choicelistStats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-4 rounded-[22px] border border-blue-100/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-blue-200/70 bg-blue-50 text-blue-600 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400">
                    <stat.icon className="size-6 stroke-[2]" />
                  </span>
                  <div>
                    <p className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom Row: 6 Feature Pills in white container */}
          <div className="rounded-[28px] border border-blue-100/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {choicelistFeatures.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className="flex flex-col items-center text-center"
                >
                  <span
                    className={`mb-3.5 flex size-12 items-center justify-center rounded-full border shadow-sm transition-transform duration-300 hover:scale-110 ${feat.iconBg}`}
                  >
                    <feat.icon className="size-5" />
                  </span>
                  <h4 className="text-sm font-black text-ink">{feat.title}</h4>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {feat.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── For Owners ── */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.48 }}
          className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8"
        >
          {/* Main Card */}
          <div className="relative overflow-hidden rounded-[32px] border border-blue-100/80 bg-gradient-to-b from-[#f8faff] via-[#f1f6fd] to-[#edf4fc] p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 sm:p-10 lg:p-12">
            {/* Ambient soft blue circle backdrop behind bedroom */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 top-0 h-[460px] w-[460px] rounded-full bg-[#dbe8fb]/70 dark:bg-blue-950/40 sm:h-[540px] sm:w-[540px]"
            />

            {/* Dot grid in top right corner */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-12 top-8 grid grid-cols-7 gap-3 opacity-35 dark:opacity-20"
            >
              {Array.from({ length: 35 }).map((_, idx) => (
                <span key={idx} className="size-1 rounded-full bg-blue-600" />
              ))}
            </div>

            <div className="relative z-10 grid items-end gap-8 lg:grid-cols-12">
              {/* Left Column: Content */}
              <div className="pb-4 lg:col-span-5">
                {/* Badge */}
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-blue-600 shadow-xs dark:border-blue-800/80 dark:bg-slate-800 dark:text-blue-400">
                  <HomeIcon className="size-3.5" />
                  For Owners
                </span>

                {/* Title */}
                <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[48px] leading-[1.08]">
                  Empty room?
                  <br />
                  Earn upto <span className="text-blue-600 dark:text-blue-500">₹15,000/mo.</span>
                </h2>

                {/* Subtitle */}
                <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
                  List your PG, flat or single room in 2 minutes. Get verified leads from real
                  tenants and working professionals.
                </p>

                {/* 3 Feature Items */}
                <div className="mt-7 space-y-4">
                  {[
                    { icon: ShieldCheck, text: "Verified tenants only" },
                    { icon: MessageSquare, text: "Direct in-app chat" },
                    { icon: Tag, text: "Free listing — zero cost" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50/90 text-blue-600 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-400">
                        <item.icon className="size-5 stroke-[2]" />
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 sm:text-base">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <div className="mt-8">
                  <Link
                    to="/signup?owner=1"
                    className="inline-flex items-center gap-3 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/35 active:scale-95 sm:text-base"
                  >
                    <span>List Property — It's Free</span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-white text-blue-600 shadow-xs">
                      <ArrowRight className="size-4 stroke-[3]" />
                    </span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Bedroom Image with floating badge & dotted arc */}
              <div className="relative flex items-end justify-center lg:col-span-7">
                {/* Dotted circular trajectory arc */}
                <svg
                  className="pointer-events-none absolute -left-2 top-2 hidden size-44 text-blue-500 lg:block"
                  viewBox="0 0 160 160"
                  fill="none"
                >
                  <path
                    d="M 28 130 A 62 62 0 1 1 126 44"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                  />
                  <polygon points="120,50 136,40 124,28" fill="#2563eb" />
                </svg>

                {/* Floating "List in 2 Minutes" badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="absolute right-2 top-2 z-20 flex items-center gap-3.5 rounded-2xl border border-white/90 bg-white/95 px-4 py-3 shadow-xl shadow-blue-950/10 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 sm:right-6 sm:top-4"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
                    <HomeIcon className="size-6" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                      List in 2 Minutes
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-0.5">
                      Reach thousands of verified tenants
                    </p>
                  </div>
                </motion.div>

                {/* Bedroom Image */}
                <div className="relative w-full">
                  <img
                    src={forOwnersBannerImg}
                    alt="Empty room earn rental income"
                    className="relative z-10 mx-auto -mb-1 w-full max-w-2xl object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Bottom: 3 Stats & Quote Row */}
            <div className="relative z-10 mt-6 rounded-[24px] border border-blue-50/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
                {/* 15k+ */}
                <div className="flex items-center gap-4 lg:col-span-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50/90 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-400">
                    <Building className="size-6 stroke-[2]" />
                  </span>
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                      15k+
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Verified rooms across<br />24 Indian cities
                    </p>
                  </div>
                </div>

                {/* 0% */}
                <div className="flex items-center gap-4 lg:col-span-3 lg:border-l lg:border-slate-100 lg:pl-8 dark:lg:border-slate-800">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50/90 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-400">
                    <ShieldCheck className="size-6 stroke-[2]" />
                  </span>
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                      0%
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Brokerage.<br />Forever.
                    </p>
                  </div>
                </div>

                {/* Quote */}
                <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-5 lg:border-l lg:border-slate-100 lg:pl-8 dark:lg:border-slate-800">
                  <Quote className="size-9 shrink-0 text-blue-500 fill-blue-500/15 rotate-180" />
                  <div>
                    <p className="text-sm font-semibold leading-snug text-slate-700 dark:text-slate-200">
                      “Listed my room on RoomsFind and got 3 genuine leads in 24 hours.”
                    </p>
                    <p className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                      — Rajesh, Bhopal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Reviews ── */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-28 top-12 size-64 rounded-full bg-gradient-to-br from-blue-400/[0.05] to-brand/[0.05] blur-3xl" />
            <div className="absolute -right-28 bottom-12 size-64 rounded-full bg-gradient-to-tl from-brand/[0.05] to-blue-400/[0.05] blur-3xl" />
          </div>

          <div className="relative">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400"
                >
                  <span className="size-1.5 rounded-full bg-blue-600" />
                  Real Stories
                </motion.span>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
                  Loved by{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    tenants & owners
                  </span>
                </h2>
              </div>
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="max-w-sm text-sm font-medium leading-6 text-slate-500 dark:text-slate-400"
              >
                Real experiences from people who found their perfect stay on RoomsFind.
              </motion.p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                {
                  name: "Ananya Sharma",
                  role: "Student, IIIT Bhopal",
                  avatar: "AS",
                  rating: 5,
                  text: "I was nervous moving to a new city for college. RoomsFind made finding a PG near campus super easy — no brokers, no fake listings. I moved in within 3 days of landing.",
                  tag: "Tenant",
                },
                {
                  name: "Vikram Mehta",
                  role: "Software Engineer, Pune",
                  avatar: "VM",
                  rating: 5,
                  text: "Switched jobs and needed a flat in Pune fast. The instant in-app chat feature is a lifesaver — directly spoke to owners, saw the place, and closed the deal in one weekend.",
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
                  text: "RoomsFind is the first platform that actually understood what migrants need. The filters are spot-on, listings are genuine, and the whole experience feels built for us.",
                  tag: "Tenant",
                },
              ].map((review, i) => (
                <motion.div
                  key={review.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-[13px] font-black text-white shadow-xs">
                        {review.avatar}
                      </span>
                      <div>
                        <p className="text-sm font-black text-ink">{review.name}</p>
                        <p className="text-[11px] font-bold text-slate-400">{review.role}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-blue-200/60 bg-blue-50/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
                      {review.tag}
                    </span>
                  </div>

                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: review.rating }, (_, s) => (
                      <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                    "{review.text}"
                  </p>

                  <div className="absolute inset-x-6 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-transform duration-300 group-hover:scale-x-100" />
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
                Everything you need to know about renting with RoomsFind.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "Is RoomsFind free for tenants?",
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
                  q: "What cities does RoomsFind cover?",
                  a: "We currently operate across almost every city in India including Bhopal, Pune, Bangalore, Hyderabad, Delhi-NCR, Indore, Mumbai, Chennai, and more. New cities are added every month.",
                },
                {
                  q: "How do I contact the owner?",
                  a: "Once you find a listing you like, use the direct in-app chat. You'll be connected directly with the property owner to discuss details, schedule a visit, or close the deal.",
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

        {/* ── Pre-Footer CTA Banner ── */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8"
        >
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white shadow-2xl shadow-blue-600/20 sm:p-12 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-16 size-80 rounded-full bg-indigo-400/20 blur-2xl"
            />

            <div className="relative z-10 flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-100 backdrop-blur-md">
                  <Sparkles className="size-3.5" /> Start Your Search Today
                </span>
                <h3 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  Find your next stay without paying brokerage fees.
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-blue-100 sm:text-base">
                  Browse verified rooms across 24 Indian cities or list your empty room in just 2
                  minutes.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-center gap-4">
                <Link
                  to="/find-room"
                  className="inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-black text-blue-600 shadow-lg shadow-black/10 transition-all duration-200 hover:bg-blue-50 hover:scale-105 active:scale-95"
                >
                  <Search className="size-4 stroke-[2.5]" />
                  <span>Explore Rooms</span>
                </Link>
                <Link
                  to="/list-room"
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-black text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95"
                >
                  <HomeIcon className="size-4 stroke-[2.5]" />
                  <span>List Property Free</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ── Main Footer ── */}
      <footer className="border-t border-slate-200/80 bg-slate-950 text-slate-300 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
          {/* Top Grid */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Brand & Description (4 cols) */}
            <div className="lg:col-span-4">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <MapPin className="size-5 stroke-[2.5]" />
                </span>
                <span className="text-2xl font-black tracking-tight text-white">RoomsFind</span>
              </Link>

              <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-slate-400">
                India's dedicated room and PG discovery platform. Direct tenant-to-owner connections,
                verified profiles, zero brokerage, and direct in-app chat.
              </p>

              {/* Trust Badges */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  100% Broker-Free
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  <Zap className="size-3.5 text-blue-400" />
                  Instant In-App Chat
                </span>
              </div>

              {/* Social Media Links */}
              <div className="mt-6 flex items-center gap-3">
                {[
                  {
                    name: "Twitter",
                    href: "https://twitter.com",
                    svg: (
                      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                  {
                    name: "Instagram",
                    href: "https://instagram.com",
                    svg: (
                      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ),
                  },
                  {
                    name: "LinkedIn",
                    href: "https://linkedin.com",
                    svg: (
                      <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    ),
                  },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.name}
                    className="flex size-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-600 hover:text-white"
                  >
                    {s.svg}
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation Columns (8 cols: 4 sub-columns) */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
              {/* Col 1: Popular Cities */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  Popular Cities
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {["Bhopal", "Pune", "Indore", "Bangalore", "Delhi NCR", "Mumbai", "Hyderabad"].map(
                    (city) => (
                      <li key={city}>
                        <Link
                          to={`/find-room?city=${encodeURIComponent(city)}`}
                          className="text-slate-400 transition-colors hover:text-white"
                        >
                          {city}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Col 2: Explore Stays */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  Explore Stays
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {[
                    { label: "Single Rooms", path: "/find-room?type=single" },
                    { label: "Shared Flats", path: "/find-room?type=shared" },
                    { label: "Student PGs", path: "/find-room?category=student" },
                    { label: "Working Stays", path: "/find-room?category=working" },
                    { label: "Private 1BHK", path: "/find-room?type=flat" },
                    { label: "Verified Leads", path: "/find-room?verified=1" },
                  ].map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.path}
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 3: For Owners */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  For Owners
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {[
                    { label: "List Property Free", path: "/list-room" },
                    { label: "Owner Dashboard", path: "/dashboard" },
                    { label: "RoomsFind 360 Studio (APK)", path: "/download-apps" },
                    { label: "Verification Guide", path: "/#how" },
                    { label: "Pricing Suggestions", path: "/list-room" },
                    { label: "Safety Guidelines", path: "/#faq" },
                    { label: "Direct In-App Chat", path: "/#features" },
                  ].map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.path}
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 4: Platform & Help */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  Support & Trust
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {[
                    { label: "Download Mobile Apps (APK)", path: "/download-apps" },
                    { label: "How It Works", path: "/#how" },
                    { label: "Zero Brokerage", path: "/#features" },
                    { label: "Frequently Asked", path: "/#faq" },
                    { label: "Contact Support", path: "/#faq" },
                    { label: "Privacy Policy", path: "/#faq" },
                    { label: "Terms of Service", path: "/#faq" },
                  ].map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.path}
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Divider & Copyright */}
          <div className="mt-14 border-t border-slate-800/80 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 text-xs font-medium text-slate-500 sm:flex-row">
              <p>© 2026 RoomsFind India Pvt. Ltd. All rights reserved.</p>
              <p className="flex items-center gap-1.5">
                Built with <Heart className="size-3.5 fill-rose-500 text-rose-500" /> for India's
                students & professionals
              </p>
              <div className="flex items-center gap-4">
                <Link to="/#faq" className="transition-colors hover:text-slate-300">
                  Privacy
                </Link>
                <span>•</span>
                <Link to="/#faq" className="transition-colors hover:text-slate-300">
                  Terms
                </Link>
                <span>•</span>
                <Link to="/#faq" className="transition-colors hover:text-slate-300">
                  Security
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
