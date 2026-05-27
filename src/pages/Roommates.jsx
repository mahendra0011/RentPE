import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import { formatPrice } from "@/lib/format.js";
import { shareRoommatePost } from "@/lib/share.js";
import { createRoommatePost, fetchRoommates } from "@/store/roommatesSlice.js";

const initialForm = {
  name: "",
  occupation: "Student",
  city: "Bhopal",
  area: "",
  collegeOrOffice: "",
  budget: "",
  roomType: "Any",
  genderPreference: "Any",
  moveIn: "Immediate",
  lifestyle: "No preference",
  phone: "",
  note: "",
};

const cities = ["Bhopal", "Pune", "Indore", "Bangalore", "Delhi NCR"];
const roomTypes = ["Any", "PG", "Flat", "Hostel", "Private room"];
const genderOptions = ["Any", "Girls", "Boys", "Co-ed"];
const quickKeywords = ["LNCT", "MP Nagar", "Hinjewadi", "TCS", "quiet", "furnished"];

export default function Roommates() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error } = useSelector((state) => state.roommates);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    city: "Bhopal",
    budgetMax: 12000,
    genderPreference: "Any",
    roomType: "Any",
  });
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [shareState, setShareState] = useState("");

  useEffect(() => {
    dispatch(fetchRoommates(filters));
  }, [dispatch, filters]);

  const activeFilterCount = useMemo(
    () =>
      Number(Boolean(filters.q)) +
      Number(filters.city !== "Bhopal") +
      Number(filters.budgetMax !== 12000) +
      Number(filters.genderPreference !== "Any") +
      Number(filters.roomType !== "Any"),
    [filters],
  );

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function chooseKeyword(keyword) {
    updateFilter("q", filters.q === keyword ? "" : keyword);
  }

  function resetFilters() {
    setFilters({
      q: "",
      city: "Bhopal",
      budgetMax: 12000,
      genderPreference: "Any",
      roomType: "Any",
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setFormError("");

    try {
      const created = await dispatch(createRoommatePost(form)).unwrap();
      setForm(initialForm);
      setFormOpen(false);
      navigate(`/roommates/${created.slug || created._id}`);
    } catch (submitError) {
      setFormError(submitError.message);
    }
  }

  async function handleShare(post) {
    try {
      const result = await shareRoommatePost(post);
      setShareState(result === "copied" ? post.slug || post._id : "");
      window.setTimeout(() => setShareState(""), 1500);
    } catch (shareError) {
      if (shareError?.name !== "AbortError") setShareState("");
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_430px]">
          <div>
            <span className="mb-3 inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
              Roommate finder
            </span>
            <h1 className="max-w-3xl text-3xl font-black tracking-normal md:text-5xl">
              Find the right person before you lock the flat.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Search by city, area, college, office, budget, room type, gender preference, move-in
              timing, and lifestyle. Built for students, interns, and first-job movers.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {quickKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => chooseKeyword(keyword)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-black transition-colors ${
                    filters.q === keyword
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand"
                  }`}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black">Quick search</h2>
              <Search className="size-4 text-brand" />
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Keyword
              </span>
              <input
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
                className="form-input"
                placeholder="LNCT, TCS, quiet, furnished"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <select
                  value={filters.city}
                  onChange={(event) => updateFilter("city", event.target.value)}
                  className="form-input"
                >
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preference">
                <select
                  value={filters.genderPreference}
                  onChange={(event) => updateFilter("genderPreference", event.target.value)}
                  className="form-input"
                >
                  {genderOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Max budget - {formatPrice(filters.budgetMax)}
              </span>
              <input
                type="range"
                min={3000}
                max={30000}
                step={500}
                value={filters.budgetMax}
                onChange={(event) => updateFilter("budgetMax", Number(event.target.value))}
                className="w-full accent-brand"
              />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen((value) => !value)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-black text-ink"
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen((value) => !value)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-black text-background"
              >
                <Plus className="size-4" />
                Post need
              </button>
            </div>
          </div>
        </section>

        {filtersOpen && (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-card p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">Match filters</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  These apply instantly to active roommate requests.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 text-xs font-black text-brand"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <FilterBlock label="Room type">
                <ChipRow
                  items={roomTypes}
                  selected={filters.roomType}
                  onSelect={(value) => updateFilter("roomType", value)}
                />
              </FilterBlock>
              <FilterBlock label="Gender preference">
                <ChipRow
                  items={genderOptions}
                  selected={filters.genderPreference}
                  onSelect={(value) => updateFilter("genderPreference", value)}
                />
              </FilterBlock>
              <FilterBlock label="City">
                <ChipRow
                  items={cities}
                  selected={filters.city}
                  onSelect={(value) => updateFilter("city", value)}
                />
              </FilterBlock>
            </div>
          </section>
        )}

        {formOpen && (
          <form
            onSubmit={onSubmit}
            className="mb-8 rounded-3xl border border-slate-200 bg-card p-5 shadow-[var(--shadow-card)] md:p-8"
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Create roommate request</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add enough detail so people can decide before messaging you.
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black text-brand">
                WhatsApp direct
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="form-input"
                  placeholder="Aarav Sharma"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  className="form-input"
                  placeholder="9876543210"
                />
              </Field>
              <Field label="Occupation">
                <select
                  value={form.occupation}
                  onChange={(event) => setForm({ ...form, occupation: event.target.value })}
                  className="form-input"
                >
                  <option>Student</option>
                  <option>Working professional</option>
                  <option>Intern</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="City">
                <input
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                  className="form-input"
                />
              </Field>
              <Field label="Area">
                <input
                  value={form.area}
                  onChange={(event) => setForm({ ...form, area: event.target.value })}
                  className="form-input"
                  placeholder="Near LNCT"
                />
              </Field>
              <Field label="College or office">
                <input
                  value={form.collegeOrOffice}
                  onChange={(event) => setForm({ ...form, collegeOrOffice: event.target.value })}
                  className="form-input"
                  placeholder="TCS office, LNCT"
                />
              </Field>
              <Field label="Budget">
                <input
                  type="number"
                  value={form.budget}
                  onChange={(event) => setForm({ ...form, budget: event.target.value })}
                  className="form-input"
                  placeholder="5000"
                />
              </Field>
              <Field label="Room type">
                <select
                  value={form.roomType}
                  onChange={(event) => setForm({ ...form, roomType: event.target.value })}
                  className="form-input"
                >
                  {roomTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preference">
                <select
                  value={form.genderPreference}
                  onChange={(event) => setForm({ ...form, genderPreference: event.target.value })}
                  className="form-input"
                >
                  {genderOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Move in">
                <input
                  value={form.moveIn}
                  onChange={(event) => setForm({ ...form, moveIn: event.target.value })}
                  className="form-input"
                  placeholder="Immediate"
                />
              </Field>
              <Field label="Lifestyle">
                <select
                  value={form.lifestyle}
                  onChange={(event) => setForm({ ...form, lifestyle: event.target.value })}
                  className="form-input"
                >
                  <option>No preference</option>
                  <option>Quiet</option>
                  <option>Social</option>
                  <option>Early riser</option>
                  <option>Night owl</option>
                </select>
              </Field>
            </div>
            <Field label="Detailed note">
              <textarea
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                className="form-input mt-4 min-h-28 resize-none"
                placeholder="Mention habits, preferred room type, location, timing, food preference, and what kind of roommate you want."
              />
            </Field>
            {formError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {formError}
              </p>
            )}
            <button className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-black text-brand-foreground">
              Publish request
            </button>
          </form>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Active roommate requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                {status === "loading" ? "Refreshing matches..." : `${items.length} matches found`}
              </p>
            </div>
          </div>
          {error && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              {error}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((post, index) => (
              <RoommateCard
                key={post.slug || post._id || `${post.phone}-${index}`}
                post={post}
                copied={shareState === (post.slug || post._id)}
                onShare={() => handleShare(post)}
              />
            ))}
          </div>
          {items.length === 0 && status !== "loading" && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-card p-10 text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-brand" />
              <h3 className="font-black">No roommate match found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try a broader budget, another city, or post your own roommate need.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function RoommateCard({ post, copied, onShare }) {
  const slug = post.slug || post._id;

  return (
    <article className="rounded-2xl border border-slate-200 bg-card p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black">{post.name}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {post.occupation || "Student"} - {post.area || post.city}
          </p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand">
          {formatPrice(post.budget)}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge icon={post.occupation === "Student" ? GraduationCap : BriefcaseBusiness}>
          {post.collegeOrOffice || post.city}
        </Badge>
        <Badge>{post.roomType || "Any room"}</Badge>
        <Badge>{post.genderPreference || "Any"}</Badge>
        <Badge>{post.moveIn || "Immediate"}</Badge>
      </div>
      <p className="min-h-12 text-sm leading-6 text-slate-600">{post.note}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          to={`/roommates/${slug}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-black text-ink hover:border-brand hover:text-brand"
        >
          Details
          <ArrowRight className="size-4" />
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-black text-ink hover:border-brand hover:text-brand"
        >
          <Share2 className="size-4" />
          {copied ? "Copied" : "Share"}
        </button>
      </div>
      <a
        href={`https://wa.me/${post.phone}?text=${encodeURIComponent(
          `Hi ${post.name}, I found your roommate request on RentPE.`,
        )}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-black text-success-foreground"
      >
        <MessageCircle className="size-4" />
        WhatsApp
      </a>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">{label}</h3>
      {children}
    </div>
  );
}

function ChipRow({ items, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
            selected === item
              ? "border-brand bg-brand text-brand-foreground"
              : "border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function Badge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}
