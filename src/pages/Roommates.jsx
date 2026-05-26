import { Briefcase, GraduationCap, MessageCircle, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import SiteHeader from "@/components/SiteHeader.jsx";
import { createRoommatePost, fetchRoommates } from "@/store/roommatesSlice.js";

const initialForm = {
  name: "",
  city: "Bhopal",
  area: "",
  collegeOrOffice: "",
  budget: "",
  genderPreference: "Any",
  moveIn: "Immediate",
  phone: "",
  note: "",
};

export default function Roommates() {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.roommates);
  const [city, setCity] = useState("Bhopal");
  const [budgetMax, setBudgetMax] = useState(12000);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    dispatch(fetchRoommates({ city, budgetMax }));
  }, [budgetMax, city, dispatch]);

  async function onSubmit(event) {
    event.preventDefault();
    setFormError("");

    try {
      await dispatch(createRoommatePost(form)).unwrap();
      setForm(initialForm);
      setFormOpen(false);
    } catch (submitError) {
      setFormError(submitError.message);
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div>
            <span className="mb-3 inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
              Roommate finder
            </span>
            <h1 className="max-w-3xl text-3xl font-black tracking-normal md:text-5xl">
              Find a roommate before you lock the flat.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Match by city, area, budget, workplace, college, move-in date, and preference. Great
              for students, interns, and first job movers.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black">Quick search</h2>
              <Search className="size-4 text-brand" />
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                City
              </span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="form-input"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Max budget - ₹{budgetMax.toLocaleString("en-IN")}
              </span>
              <input
                type="range"
                min={3000}
                max={30000}
                step={500}
                value={budgetMax}
                onChange={(event) => setBudgetMax(Number(event.target.value))}
                className="w-full accent-brand"
              />
            </label>
            <button
              type="button"
              onClick={() => setFormOpen((value) => !value)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-black text-background"
            >
              <Plus className="size-4" />
              Post roommate need
            </button>
          </div>
        </section>

        {formOpen && (
          <form
            onSubmit={onSubmit}
            className="mb-8 rounded-3xl border border-slate-200 bg-card p-5 shadow-[var(--shadow-card)] md:p-8"
          >
            <div className="mb-5">
              <h2 className="text-xl font-black">Create roommate request</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your phone is used only for direct WhatsApp connection.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
              <Field label="Preference">
                <select
                  value={form.genderPreference}
                  onChange={(event) => setForm({ ...form, genderPreference: event.target.value })}
                  className="form-input"
                >
                  <option>Any</option>
                  <option>Girls</option>
                  <option>Boys</option>
                  <option>Co-ed</option>
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
            </div>
            <Field label="Note">
              <textarea
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                className="form-input mt-4 min-h-28 resize-none"
                placeholder="Mention habits, preferred location, and timing."
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
          <div className="mb-4 flex items-end justify-between">
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
              <article
                key={`${post.phone}-${index}`}
                className="rounded-2xl border border-slate-200 bg-card p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{post.name}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {post.area || post.city} - {post.moveIn}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand">
                    ₹{Number(post.budget).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge icon={post.collegeOrOffice ? GraduationCap : Briefcase}>
                    {post.collegeOrOffice || post.city}
                  </Badge>
                  <Badge>{post.genderPreference}</Badge>
                </div>
                <p className="min-h-12 text-sm leading-6 text-slate-600">{post.note}</p>
                <a
                  href={`https://wa.me/${post.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-black text-success-foreground"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
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

function Badge({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}
