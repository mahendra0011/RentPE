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
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

const popularCities = ["Bhopal", "Indore", "Pune", "Bangalore", "Delhi NCR"];

const steps = [
  {
    icon: Search,
    title: "Search nearby rooms",
    body: "Enter city, college, office or area. RoomRadar shows matching PGs, flats and hostels.",
  },
  {
    icon: SlidersHorizontal,
    title: "Apply filters",
    body: "Filter by price, distance, room type, tenant preference, furnished status and amenities.",
  },
  {
    icon: MessageCircle,
    title: "Connect directly",
    body: "Open WhatsApp, call the owner, visit the room and finalize without a broker.",
  },
];

const ownerSteps = ["Create owner account", "Upload room details", "Get direct tenant leads"];

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
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const apiRooms = useSelector((state) => state.rooms.items);
  const rooms = apiRooms.length ? apiRooms : normalizeRooms(staticRooms);

  useEffect(() => {
    dispatch(fetchRooms({ availableOnly: true }));
  }, [dispatch]);

  function onSearch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = form.get("query") || "";
    navigate(query ? `/search?query=${encodeURIComponent(query)}` : "/search?all=1");
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <section id="how" className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 md:pb-18 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
              <ShieldCheck className="size-4" />
              How it works
            </span>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl lg:text-[60px]">
              Find or list a room in three clean steps.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
              No map clutter. No broker loop. Search rooms, apply filters, and connect directly with
              verified owners.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                className="rounded-[22px] border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-4xl font-black text-slate-100">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-black text-ink">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.body}</p>
              </motion.article>
            ))}
          </div>

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
                  placeholder="Search Bhopal, LNCT, MP Nagar..."
                  className="w-full bg-transparent text-sm font-black text-ink outline-none placeholder:text-slate-400"
                />
              </label>
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-black text-brand-foreground shadow-lg shadow-brand/30 transition-transform active:scale-95 md:h-full">
                <Search className="size-4" />
                Find Rooms
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
                onClick={() => navigate(`/search?query=${encodeURIComponent(city)}`)}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand"
              >
                {city}
              </button>
            ))}
          </div>
        </section>

        <section id="listings" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-ink">Available rooms</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Preview listings from nearby PGs, hostels and flats.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/search?filters=1"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
              >
                <SlidersHorizontal className="size-4" />
                Filter
              </Link>
              <Link
                to="/search?all=1"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800"
              >
                See all
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {rooms.slice(0, 3).map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
          <div className="grid overflow-hidden rounded-[28px] bg-[#07111f] px-6 py-10 text-white md:min-h-[360px] md:grid-cols-[0.95fr_1.05fr] md:items-center md:px-14 md:py-14">
            <div>
              <span className="inline-flex rounded-full bg-brand/25 px-4 py-1 text-xs font-black uppercase tracking-wide text-indigo-100">
                Roommate Finder
              </span>
              <h2 className="mt-5 max-w-md text-4xl font-black leading-tight tracking-normal">
                Find a roommate before locking a flat.
              </h2>
              <p className="mt-4 max-w-md text-base font-medium leading-7 text-slate-400">
                Post a roommate request and match by college, office, budget and move-in date.
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

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr] md:py-16">
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <span className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand">
              <Building2 className="size-4" />
              For Owners
            </span>
            <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink">
              Empty room? List it in minutes.
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
              Create an owner account, add photos, price, amenities and contact number, then get
              direct tenant leads.
            </p>
            <Link
              to="/signup?owner=1"
              className="mt-7 inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-black text-white transition-colors hover:bg-slate-800"
            >
              List Property - It's Free
            </Link>
          </div>

          <div className="rounded-[24px] bg-brand-soft p-8 md:p-10">
            <h3 className="text-xl font-black text-ink">Owner flow</h3>
            <div className="mt-6 space-y-4">
              {ownerSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-black text-brand">
                    {index + 1}
                  </span>
                  <span className="text-sm font-black text-slate-700">{step}</span>
                </div>
              ))}
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
              Modern housing for India's students, interns and migrants. Find a room you actually
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
          (c) 2026 RoomRadar India. Built for direct room discovery.
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
            to={link === "How it Works" ? "/#how" : `/search?query=${encodeURIComponent(link)}`}
            className="block font-bold text-slate-500 hover:text-brand"
          >
            {link}
          </Link>
        ))}
      </div>
    </div>
  );
}
