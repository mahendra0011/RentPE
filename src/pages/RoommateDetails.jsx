import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  GraduationCap,
  HeartHandshake,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import { formatPrice } from "@/lib/format.js";
import { shareRoommatePost } from "@/lib/share.js";
import { fetchRoommate } from "@/store/roommatesSlice.js";

export default function RoommateDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { activePost, items, error } = useSelector((state) => state.roommates);
  const itemPost = items.find((post) => post.slug === id || post._id === id);
  const post =
    activePost?.slug === id || activePost?._id === id ? activePost : itemPost || activePost;
  const [shareState, setShareState] = useState("");

  useEffect(() => {
    dispatch(fetchRoommate(id));
  }, [dispatch, id]);

  async function handleShare() {
    try {
      const result = await shareRoommatePost(post);
      setShareState(result === "copied" ? "Link copied" : "Shared");
      window.setTimeout(() => setShareState(""), 1600);
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        setShareState("Try again");
        window.setTimeout(() => setShareState(""), 1600);
      }
    }
  }

  if (!post && !error) {
    return (
      <div className="min-h-screen bg-background font-sans text-ink">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-card p-10 font-black">
            Loading roommate request...
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background font-sans text-ink">
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="text-2xl font-black">Roommate request not found</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This request may have been closed or removed.
          </p>
          <Link
            to="/roommates"
            className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-black text-background"
          >
            Back to roommate finder
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link
          to="/roommates"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-black text-slate-600 transition-colors hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Back to roommate finder
        </Link>

        <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="rounded-[28px] border border-slate-200 bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-6">
                <div>
                  <span className="mb-4 inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
                    Roommate request
                  </span>
                  <h1 className="text-3xl font-black tracking-normal md:text-5xl">
                    {post.name} is looking for a roommate.
                  </h1>
                  <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
                    <MapPin className="size-4" />
                    {[post.area, post.city].filter(Boolean).join(", ")}
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-soft p-5 text-brand">
                  <p className="text-xs font-black uppercase tracking-wide">Budget</p>
                  <p className="mt-1 text-3xl font-black">{formatPrice(post.budget)}</p>
                </div>
              </div>

              <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoTile
                  icon={post.occupation === "Student" ? GraduationCap : BriefcaseBusiness}
                  label="Profile"
                  value={post.occupation || "Student"}
                />
                <InfoTile icon={Users} label="Preference" value={post.genderPreference || "Any"} />
                <InfoTile icon={HeartHandshake} label="Room type" value={post.roomType || "Any"} />
                <InfoTile icon={CalendarDays} label="Move in" value={post.moveIn || "Immediate"} />
              </div>

              <section className="border-t border-slate-200 py-6">
                <h2 className="mb-3 text-lg font-black">Detailed note</h2>
                <p className="leading-7 text-slate-600">
                  {post.note || "No extra note added yet. Connect directly to discuss details."}
                </p>
              </section>

              <section className="border-t border-slate-200 py-6">
                <h2 className="mb-4 text-lg font-black">Match details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="City" value={post.city} />
                  <DetailRow label="Area" value={post.area || "Flexible"} />
                  <DetailRow label="College / office" value={post.collegeOrOffice || "Flexible"} />
                  <DetailRow label="Lifestyle" value={post.lifestyle || "No preference"} />
                </div>
              </section>

              <section className="border-t border-slate-200 pt-6">
                <h2 className="mb-4 text-lg font-black">Before you finalize</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "Meet in a public place first",
                    "Visit the room before paying",
                    "Confirm rent split and deposit",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-background p-4"
                    >
                      <Check className="mb-3 size-4 text-success" />
                      <p className="text-sm font-bold leading-5 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside>
            <div className="rounded-3xl border border-slate-200 bg-card p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand text-lg font-black text-brand-foreground">
                  {post.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="font-black">{post.name}</p>
                  <p className="text-xs font-bold text-slate-500">{post.occupation || "Student"}</p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black">
                  <IndianRupee className="size-4 text-brand" />
                  {formatPrice(post.budget)} budget
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm font-black">
                  <Sparkles className="size-4 text-brand" />
                  {post.roomType || "Any"} preferred
                </div>
              </div>

              <a
                href={`https://wa.me/${post.phone}?text=${encodeURIComponent(
                  `Hi ${post.name}, I found your roommate request on RentPE.`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 font-black text-success-foreground transition-colors hover:bg-success/90"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
              <a
                href={`tel:+${post.phone}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-black text-ink transition-colors hover:bg-slate-50"
              >
                <Phone className="size-4" />
                Call +91 {String(post.phone).slice(-10, -5)} {String(post.phone).slice(-5)}
              </a>
              <button
                type="button"
                onClick={handleShare}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-black text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <Share2 className="size-4" />
                {shareState || "Share request"}
              </button>

              <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-black">
                  <ShieldCheck className="size-4 text-success" />
                  Safety reminder
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  RentPE connects people directly. Always verify identity, visit the room, and avoid
                  advance payment before confirmation.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-background p-4">
      <Icon className="mb-3 size-5 text-brand" />
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-background p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
