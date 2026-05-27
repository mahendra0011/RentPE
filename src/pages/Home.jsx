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
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import AnimatedCounter from "@/components/reactbits/AnimatedCounter.jsx";
import ElectricBorder from "@/components/reactbits/ElectricBorder.jsx";
import InfiniteTicker from "@/components/reactbits/InfiniteTicker.jsx";
import SpotlightPanel from "@/components/reactbits/SpotlightPanel.jsx";
import TiltCard from "@/components/reactbits/TiltCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
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
    icon: Search,
    title: "Search by keyword",
    body: "Type any city, area, college, office, or landmark keyword and compare matching rooms.",
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

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const apiRooms = useSelector((state) => state.rooms.items);
  const rooms = apiRooms.length ? apiRooms : normalizeRooms(staticRooms);
  const previewRooms = rooms.slice(0, 3);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

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
              Your perfect room in <span className="text-brand">any city.</span>
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
              <h2 className="text-3xl font-black tracking-normal text-ink">
                Rooms matching your move
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Search by city, area, landmark, title, or owner-posted address
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/find-room?filters=1"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand"
              >
                <SlidersHorizontal className="size-4" />
                Filter
              </Link>
              <Link
                to="/find-room?all=1"
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
                <p className="font-black text-ink">No rooms available yet</p>
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
            <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm md:p-10">
              <div className="mb-10 text-center">
                <span className="mb-4 inline-flex rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
                  How it Works
                </span>
                <h2 className="mx-auto max-w-3xl text-3xl font-black leading-tight tracking-normal text-ink sm:text-4xl">
                  Find or list a room in <span className="text-brand">three simple steps.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
                  Search by keyword, compare verified listings, and connect directly with owners. No
                  brokers. No spam.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {steps.map((step, index) => (
                  <motion.article
                    key={step.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    whileHover={{ y: -5, scale: 1.015 }}
                    transition={{ delay: index * 0.08, duration: 0.36 }}
                    className="rounded-[20px] border border-slate-200 bg-white p-7 shadow-sm"
                  >
                    <span className="animate-float-soft mb-7 flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <step.icon className="size-5" />
                    </span>
                    <h3 className="text-base font-black text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.body}</p>
                  </motion.article>
                ))}
              </div>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/find-room"
                  className="animate-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-transform hover:-translate-y-0.5 active:scale-95"
                >
                  Browse rooms
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/signup?owner=1"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-black text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  List your room
                </Link>
              </div>
            </div>
          </ElectricBorder>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.48 }}
          className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16"
        >
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
              Whether you are joining college, starting a job, or shifting cities, RentPE keeps the
              first decision simple.
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
              <div className="p-7 md:p-10">
                <span className="inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
                  Smart shortlist
                </span>
                <h2 className="mt-5 max-w-lg text-3xl font-black leading-tight tracking-normal md:text-4xl">
                  Choose rooms with cleaner match signals.
                </h2>
                <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-slate-600">
                  Compare rent, trust, amenities, and owner contact in one calm flow before you
                  spend time calling or visiting.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {shortlistStats.map((stat) => (
                    <div key={stat.label} className="rounded-[18px] border border-slate-200 p-4">
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
                  itemClassName="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-600"
                />
              </div>

              <div className="bg-[#07111f] p-5 text-white md:p-8">
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
                      className="rounded-[20px] border border-white/10 bg-white/10 p-5 backdrop-blur"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-indigo-200">
                          <card.icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-black text-white">{card.title}</h4>
                            <span className="text-sm font-black text-emerald-200">
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
                              className="h-full rounded-full bg-emerald-300"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
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
          className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.85fr_0.9fr] md:py-16"
        >
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm md:p-12"
          >
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
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="rounded-[24px] bg-brand-soft p-8 text-brand md:p-10"
          >
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
          </motion.div>
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
