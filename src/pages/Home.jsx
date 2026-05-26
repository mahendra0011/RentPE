import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import AnimatedCounter from "@/components/reactbits/AnimatedCounter.jsx";
import InfiniteTicker from "@/components/reactbits/InfiniteTicker.jsx";
import SpotlightPanel from "@/components/reactbits/SpotlightPanel.jsx";
import TiltCard from "@/components/reactbits/TiltCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

const popularCities = ["Bhopal", "Indore", "Pune", "Bangalore", "Delhi NCR"];
const filterTypes = ["PG", "Hostel", "Flat"];
const filterGenders = ["Girls", "Boys", "Co-ed"];
const filterAmenities = ["WiFi", "AC", "Parking", "Mess", "Lift", "CCTV"];
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
    icon: Search,
    title: "Search by location",
    body: "Type your college, office or area. We show verified rooms within walking distance.",
  },
  {
    icon: ShieldCheck,
    title: "Verified listings",
    body: "Every owner is identity-verified. Filter by gender, budget, amenities and room type.",
  },
  {
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

const roommateCards = [
  {
    icon: GraduationCap,
    name: "Aarav, 21",
    detail: "B.Tech CSE - LNCT - Rs. 5k budget",
  },
  {
    icon: BriefcaseBusiness,
    name: "Riya, 24",
    detail: "TCS Intern - Powai - Rs. 10k budget",
  },
];

export default function Home() {
  const dispatch = useDispatch();
  const apiRooms = useSelector((state) => state.rooms.items);
  const rooms = apiRooms.length ? apiRooms : normalizeRooms(staticRooms);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [priceMax, setPriceMax] = useState(20000);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [furnishedOnly, setFurnishedOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    function openHashTarget() {
      const targetId = window.location.hash.slice(1);
      if (!targetId) return;

      if (targetId === "listings") {
        setShowAll(true);
        setShowFilters(true);
      }

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

    setSearchQuery(query);
    setShowAll(true);

    if (budget) {
      setPriceMax(Number(budget));
    }
  }

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const haystack = `${room.city} ${room.location} ${room.address} ${room.title}`
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ");
        const queryTerms = searchQuery
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((term) => term.length > 2 && !["near", "room", "rooms"].includes(term));
        const queryMatch = !queryTerms.length || queryTerms.some((term) => haystack.includes(term));

        if (!queryMatch) return false;
        if (room.price > priceMax) return false;
        if (selectedTypes.length && !selectedTypes.includes(room.type)) return false;
        if (selectedGenders.length && !selectedGenders.includes(room.gender)) return false;
        if (furnishedOnly && !room.furnished) return false;
        if (
          selectedAmenities.length &&
          !selectedAmenities.every((amenity) => room.amenities.includes(amenity))
        ) {
          return false;
        }

        return true;
      }),
    [
      furnishedOnly,
      priceMax,
      rooms,
      searchQuery,
      selectedAmenities,
      selectedGenders,
      selectedTypes,
    ],
  );

  const visibleRooms = showAll ? filteredRooms : filteredRooms.slice(0, 3);

  function toggleFilter(list, value, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function resetFilters() {
    setPriceMax(20000);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAmenities([]);
    setFurnishedOnly(false);
  }

  function chooseCity(city) {
    setSearchQuery(city);
    setShowAll(true);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl lg:text-[64px]">
              Your perfect room in <span className="text-brand">any city.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
              The smartest way for students and migrants to find PG, flats, and roommates near
              colleges or offices. Zero brokerage, direct owner contact.
            </p>

            <form
              onSubmit={onSearch}
              className="mx-auto mt-10 max-w-[760px] rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-32px_rgba(79,70,229,0.55)] md:rounded-full"
            >
              <div className="flex flex-col gap-2 md:h-14 md:flex-row md:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 md:px-5 md:py-0">
                  <MapPin className="size-5 shrink-0 text-slate-400" />
                  <input
                    name="query"
                    type="text"
                    placeholder="Near LNCT College, Bhopal"
                    defaultValue="Near LNCT College, Bhopal"
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
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-black text-brand-foreground shadow-lg shadow-brand/30 transition-transform active:scale-95 md:h-full">
                  <Search className="size-4" />
                  Search
                </button>
              </div>
            </form>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                Popular:
              </span>
              {popularCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => chooseCity(city)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand"
                >
                  {city}
                </button>
              ))}
            </div>

            <InfiniteTicker
              items={heroSignals}
              duration={18}
              className="mx-auto mt-8 max-w-3xl"
              itemClassName="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm"
            />
          </motion.div>
        </section>

        <section id="listings" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-ink">Rooms near you</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Showing <span className="font-black text-ink">142 properties</span> within 5 km of
                your search
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
              >
                <SlidersHorizontal className="size-4" />
                Filter
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAll(true);
                  setShowFilters(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800"
              >
                See all
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-7 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-ink">Filters</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Showing {visibleRooms.length} of {filteredRooms.length} matching rooms
                    {searchQuery ? ` for ${searchQuery}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-black text-brand"
                >
                  Reset
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-4">
                <FilterBlock label={`Max price - Rs. ${priceMax.toLocaleString("en-IN")}`}>
                  <input
                    type="range"
                    min={2000}
                    max={30000}
                    step={500}
                    value={priceMax}
                    onChange={(event) => setPriceMax(Number(event.target.value))}
                    className="w-full accent-brand"
                  />
                </FilterBlock>

                <FilterBlock label="Property type">
                  <ChipRow
                    items={filterTypes}
                    selected={selectedTypes}
                    onToggle={(value) => toggleFilter(selectedTypes, value, setSelectedTypes)}
                  />
                </FilterBlock>

                <FilterBlock label="Tenant">
                  <ChipRow
                    items={filterGenders}
                    selected={selectedGenders}
                    onToggle={(value) => toggleFilter(selectedGenders, value, setSelectedGenders)}
                  />
                </FilterBlock>

                <FilterBlock label="Amenities">
                  <ChipRow
                    items={filterAmenities}
                    selected={selectedAmenities}
                    onToggle={(value) =>
                      toggleFilter(selectedAmenities, value, setSelectedAmenities)
                    }
                  />
                </FilterBlock>
              </div>

              <label className="mt-5 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={furnishedOnly}
                  onChange={(event) => setFurnishedOnly(event.target.checked)}
                  className="size-4 accent-brand"
                />
                <span className="text-sm font-bold text-slate-700">Furnished only</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {visibleRooms.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
            {visibleRooms.length === 0 && (
              <div className="col-span-full rounded-[22px] border border-dashed border-slate-200 bg-white py-14 text-center">
                <p className="font-black text-ink">No rooms match these filters</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 text-sm font-black text-brand"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 md:py-16">
          <div className="mb-10 text-center">
            <span className="mb-4 inline-flex rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
              How it Works
            </span>
            <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl">
              Find or list a room in <span className="text-brand">three simple steps.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
              Search near your college or office, compare verified listings, and connect directly
              with owners. No brokers. No spam.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.title}
                className="rounded-[20px] border border-slate-200 bg-white p-7 shadow-sm"
              >
                <span className="mb-7 flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <step.icon className="size-5" />
                </span>
                <h3 className="text-base font-black text-ink">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#listings"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-transform active:scale-95"
            >
              Browse rooms
              <ArrowRight className="size-4" />
            </a>
            <Link
              to="/signup?owner=1"
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-black text-ink transition-colors hover:border-brand hover:text-brand"
            >
              List your room
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
          <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <span className="mb-3 inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
                Find your fit
              </span>
              <h2 className="text-3xl font-black tracking-normal text-ink">
                Start with the stay type that matches your move.
              </h2>
            </div>
            <p className="max-w-md text-sm font-medium leading-6 text-slate-500">
              Whether you are joining college, starting a job, or shifting cities, RoomRadar keeps
              the first decision simple.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            {discoveryCards.map((card, index) => (
              <TiltCard
                key={card.title}
                delay={index * 0.06}
                className="p-6 transition-shadow hover:shadow-[var(--shadow-card)]"
              >
                <span className="mb-7 flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <card.icon className="size-5" />
                </span>
                <h3 className="font-black text-ink">{card.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{card.body}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-400">
                  {card.meta}
                </p>
              </TiltCard>
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
          <SpotlightPanel className="border-0 bg-[#07111f] text-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.8)]">
            <div className="grid overflow-hidden rounded-[28px] md:grid-cols-[0.9fr_1.1fr]">
              <div className="p-7 md:p-10">
                <span className="inline-flex rounded-full bg-emerald-400/15 px-4 py-1 text-xs font-black uppercase tracking-wide text-emerald-200">
                  Live city pulse
                </span>
                <h2 className="mt-5 max-w-md text-3xl font-black leading-tight tracking-normal md:text-4xl">
                  See where rooms are moving fastest.
                </h2>
                <p className="mt-4 max-w-md text-sm font-medium leading-7 text-slate-300">
                  Use quick city signals to jump into areas with fresh PGs, flats, hostels, and
                  owner-posted rooms.
                </p>
                <a
                  href="#listings"
                  className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-ink transition-colors hover:bg-slate-100"
                >
                  Find Room
                  <ArrowRight className="size-4" />
                </a>
                <InfiniteTicker
                  items={neighborhoodTicker}
                  duration={20}
                  className="mt-8 max-w-sm"
                  itemClassName="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black text-slate-200"
                />
              </div>

              <div className="grid gap-4 bg-white/5 p-5 md:p-8">
                {cityPulse.map((city, index) => (
                  <motion.article
                    key={city.city}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                    className="rounded-[20px] border border-white/10 bg-white/10 p-5 backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-white">{city.city}</h3>
                        <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                          {city.area}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
                        <AnimatedCounter value={city.rooms} suffix="+" /> rooms
                      </span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${city.fill}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.2 + index * 0.12 }}
                        className="h-full rounded-full bg-emerald-300"
                      />
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </SpotlightPanel>
        </motion.section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
          <div className="grid overflow-hidden rounded-[28px] bg-[#07111f] px-6 py-10 text-white md:min-h-[360px] md:grid-cols-[0.95fr_1.05fr] md:items-center md:px-14 md:py-14">
            <div>
              <span className="inline-flex rounded-full bg-brand/25 px-4 py-1 text-xs font-black uppercase tracking-wide text-indigo-100">
                New Feature
              </span>
              <h2 className="mt-5 max-w-md text-4xl font-black leading-tight tracking-normal">
                Find a Roommate first.
              </h2>
              <p className="mt-4 max-w-md text-base font-medium leading-7 text-slate-400">
                Found a great 2BHK but it's too expensive? Post a roommate request and split the
                rent. Match with students from the same college.
              </p>
              <Link
                to="/roommates"
                className="mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-white px-8 text-sm font-black text-ink transition-colors hover:bg-slate-100"
              >
                Find Roommate
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 md:mt-0 md:pl-6">
              {roommateCards.map((person, index) => (
                <div
                  key={person.name}
                  className={`rounded-[20px] border border-white/10 bg-white/10 p-6 backdrop-blur ${
                    index === 1 ? "md:translate-y-8" : ""
                  }`}
                >
                  <span className="mb-8 flex size-10 items-center justify-center rounded-full bg-brand/20 text-indigo-200">
                    <person.icon className="size-5" />
                  </span>
                  <p className="font-black text-white">{person.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{person.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.85fr_0.9fr] md:py-16">
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <span className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand">
              <Building2 className="size-4" />
              For Owners
            </span>
            <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink">
              Empty room? Earn upto <span className="text-brand">₹15,000/mo.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
              List your PG, flat or single room in 2 minutes. Get verified leads from real tenants
              and working professionals.
            </p>
            <Link
              to="/signup?owner=1"
              className="mt-7 inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-black text-white transition-colors hover:bg-slate-800"
            >
              List Property - It's Free
            </Link>
          </div>

          <div className="rounded-[24px] bg-brand-soft p-8 text-brand md:p-10">
            <div>
              <p className="text-5xl font-black tracking-normal">15k+</p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Verified rooms across 24 Indian cities
              </p>
            </div>
            <div className="my-10 h-px bg-brand/15" />
            <div>
              <p className="text-5xl font-black tracking-normal">0%</p>
              <p className="mt-1 text-sm font-medium text-slate-600">Brokerage. Forever.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
                <MapPin className="size-4" />
              </span>
              <span className="text-lg font-black text-ink">RoomRadar</span>
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
          (c) 2026 RoomRadar India. Made for the modern nomad.
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

function FilterBlock({ label, children }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">{label}</h4>
      {children}
    </div>
  );
}

function ChipRow({ items, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item);

        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={`rounded-full border px-3 py-1 text-xs font-black transition-colors ${
              active
                ? "border-brand bg-brand text-brand-foreground"
                : "border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
