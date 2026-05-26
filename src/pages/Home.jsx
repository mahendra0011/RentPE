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

const roommateCards = [
  {
    icon: GraduationCap,
    name: "Aarav, 21",
    detail: "B.Tech CSE - LNCT - ₹5k budget",
  },
  {
    icon: BriefcaseBusiness,
    name: "Riya, 24",
    detail: "TCS Intern - Powai - ₹10k budget",
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
    const query = form.get("query") || "Near LNCT College, Bhopal";
    navigate(`/search?query=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-20 text-center sm:px-6 md:pb-20 md:pt-24">
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
                    <option>Any Budget</option>
                    <option>Under ₹5,000</option>
                    <option>₹5k - ₹10k</option>
                    <option>₹10k - ₹20k</option>
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
                  onClick={() => navigate(`/search?query=${encodeURIComponent(city)}`)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand"
                >
                  {city}
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        <section id="listings" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-ink">Rooms near you</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Showing <span className="font-black text-ink">142 properties</span> within 5 km of
                your search
              </p>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
            >
              <SlidersHorizontal className="size-4" />
              Filter
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {rooms.slice(0, 3).map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-normal text-ink">
              Find or list in three steps
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              No brokers. No spam. Just direct connections.
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
        </section>

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
