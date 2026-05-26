import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  PartyPopper,
  Phone,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import { markPosted } from "@/store/roomsSlice.js";

const steps = [
  { id: 1, label: "Details", icon: Home },
  { id: 2, label: "Photos", icon: Upload },
  { id: 3, label: "Location", icon: MapPin },
  { id: 4, label: "Contact", icon: Phone },
];

const amenities = [
  "WiFi",
  "AC",
  "Geyser",
  "Parking",
  "Mess",
  "CCTV",
  "Laundry",
  "Power Backup",
  "Lift",
  "Gym",
];

const initialData = {
  title: "",
  type: "PG",
  gender: "Co-ed",
  price: "",
  description: "",
  amenities: [],
  photos: [],
  address: "",
  city: "",
  landmark: "",
  ownerName: "",
  phone: "",
  whatsapp: true,
};

export default function ListRoom() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(initialData);

  const previews = useMemo(
    () => data.photos.map((file) => URL.createObjectURL(file)),
    [data.photos],
  );

  function update(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleAmenity(amenity) {
    update(
      "amenities",
      data.amenities.includes(amenity)
        ? data.amenities.filter((item) => item !== amenity)
        : [...data.amenities, amenity],
    );
  }

  function onFiles(files) {
    if (!files) return;
    const nextFiles = Array.from(files).slice(0, 8 - data.photos.length);
    update("photos", [...data.photos, ...nextFiles]);
  }

  function removePhoto(index) {
    update(
      "photos",
      data.photos.filter((_, photoIndex) => photoIndex !== index),
    );
  }

  if (!user || user.role !== "owner") {
    return (
      <div className="min-h-screen bg-background font-sans text-ink">
        <SiteHeader />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4 py-16 sm:px-6">
          <section className="w-full rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
              <ShieldCheck className="size-8" />
            </span>
            <h1 className="text-3xl font-black tracking-normal text-ink">Owner login required.</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              Tick the room owner checkbox during OTP login, then List Your Room will open from the
              navbar.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/login?owner=1"
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-black text-brand-foreground"
              >
                Owner Login
              </Link>
              <Link
                to="/signup?owner=1"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-black text-ink"
              >
                Owner Sign Up
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  async function publishListing() {
    setSubmitting(true);
    setError("");

    try {
      const payload = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === "photos") return;
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        payload.append(key, value);
      });
      data.photos.forEach((file) => payload.append("photos", file));

      const response = await fetch("/api/rooms", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Unable to publish listing");
      }

      const createdRoom = await response.json();
      dispatch(markPosted(createdRoom.slug || createdRoom.id));
      setDone(true);
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background font-sans text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-success"
          >
            <PartyPopper className="size-9 text-success-foreground" />
          </motion.div>
          <h1 className="mb-3 text-3xl font-black tracking-normal">Your listing is live.</h1>
          <p className="mb-8 text-slate-600">
            It has been sent to the RentPE API and is ready for verified tenants.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/"
              className="rounded-full bg-ink px-6 py-3 text-sm font-black text-background"
            >
              Back home
            </Link>
            <Link
              to="/#listings"
              className="rounded-full border border-slate-200 px-6 py-3 text-sm font-black"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
            For owners
          </span>
          <h1 className="text-3xl font-black tracking-normal md:text-4xl">
            List your room in 2 minutes
          </h1>
          <p className="mt-2 text-slate-500">No brokerage. Direct leads on WhatsApp.</p>
        </div>

        <div className="relative mb-10 flex items-center justify-between">
          <div className="absolute left-0 right-0 top-5 -z-10 h-0.5 bg-slate-200" />
          <div
            className="absolute left-0 top-5 -z-10 h-0.5 bg-brand transition-all"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((item) => {
            const active = step === item.id;
            const complete = step > item.id;

            return (
              <div key={item.id} className="flex flex-col items-center gap-2 bg-background px-2">
                <div
                  className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                    complete
                      ? "border-brand bg-brand text-brand-foreground"
                      : active
                        ? "border-brand bg-background text-brand"
                        : "border-slate-200 bg-background text-slate-400"
                  }`}
                >
                  {complete ? <Check className="size-5" /> : <item.icon className="size-4" />}
                </div>
                <span
                  className={`text-xs font-black ${
                    active ? "text-brand" : complete ? "text-ink" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-card p-5 shadow-[var(--shadow-card)] sm:p-8 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
            >
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">Tell us about your room</h2>
                  <Field label="Listing title">
                    <input
                      value={data.title}
                      onChange={(event) => update("title", event.target.value)}
                      placeholder="Sunny single PG room near LNCT"
                      className="form-input"
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Property type">
                      <select
                        value={data.type}
                        onChange={(event) => update("type", event.target.value)}
                        className="form-input"
                      >
                        <option>PG</option>
                        <option>Hostel</option>
                        <option>Flat</option>
                      </select>
                    </Field>
                    <Field label="Tenant gender">
                      <select
                        value={data.gender}
                        onChange={(event) => update("gender", event.target.value)}
                        className="form-input"
                      >
                        <option>Co-ed</option>
                        <option>Girls</option>
                        <option>Boys</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Monthly rent (₹)">
                    <input
                      type="number"
                      value={data.price}
                      onChange={(event) => update("price", event.target.value)}
                      placeholder="6500"
                      className="form-input"
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={data.description}
                      onChange={(event) => update("description", event.target.value)}
                      rows={4}
                      placeholder="Mention nearby colleges, food options, safety, and house rules."
                      className="form-input resize-none"
                    />
                  </Field>
                  <Field label="Amenities">
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((amenity) => {
                        const active = data.amenities.includes(amenity);
                        return (
                          <button
                            type="button"
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`rounded-full border px-4 py-1.5 text-xs font-black transition-colors ${
                              active
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-slate-200 text-slate-600 hover:border-brand hover:text-brand"
                            }`}
                          >
                            {active && <Check className="mr-1 inline size-3" />}
                            {amenity}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">Add photos</h2>
                  <p className="-mt-3 text-sm text-slate-500">
                    Up to 8 photos. The first is your cover.
                  </p>
                  <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center transition-colors hover:border-brand hover:bg-brand-soft/40">
                    <Upload className="mx-auto mb-3 size-8 text-slate-400" />
                    <p className="text-sm font-black">Click to upload photos</p>
                    <p className="mt-1 text-xs text-slate-400">JPG or PNG up to 10MB each</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => onFiles(event.target.files)}
                    />
                  </label>
                  {data.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {previews.map((preview, index) => (
                        <div
                          key={preview}
                          className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                        >
                          <img src={preview} alt="" className="h-full w-full object-cover" />
                          {index === 0 && (
                            <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-foreground">
                              Cover
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            aria-label="Remove photo"
                            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/80 text-background opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">Where is it located?</h2>
                  <Field label="Full address">
                    <input
                      value={data.address}
                      onChange={(event) => update("address", event.target.value)}
                      placeholder="House no, street, area"
                      className="form-input"
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="City">
                      <input
                        value={data.city}
                        onChange={(event) => update("city", event.target.value)}
                        placeholder="Bhopal"
                        className="form-input"
                      />
                    </Field>
                    <Field label="Nearest landmark">
                      <input
                        value={data.landmark}
                        onChange={(event) => update("landmark", event.target.value)}
                        placeholder="LNCT, DB Mall"
                        className="form-input"
                      />
                    </Field>
                  </div>
                  <div className="rounded-xl bg-brand-soft p-4 text-xs font-bold leading-5 text-slate-700">
                    RentPE uses this address and landmark for nearby search. Users will see the
                    area, distance, price, photos, and owner contact.
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">How can seekers reach you?</h2>
                  <Field label="Your name">
                    <input
                      value={data.ownerName}
                      onChange={(event) => update("ownerName", event.target.value)}
                      placeholder="Sunita Sharma"
                      className="form-input"
                    />
                  </Field>
                  <Field label="Phone number">
                    <div className="flex">
                      <span className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                        +91
                      </span>
                      <input
                        value={data.phone}
                        onChange={(event) =>
                          update("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        placeholder="9876543210"
                        className="w-full rounded-r-xl border border-slate-200 bg-background px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  </Field>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={data.whatsapp}
                      onChange={(event) => update("whatsapp", event.target.checked)}
                      className="mt-1 size-4 accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-black">
                        Allow WhatsApp leads on this number
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Seekers can message you directly. You can disable it later.
                      </span>
                    </span>
                  </label>
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <span className="text-xs font-bold text-slate-400">
              Step {step} of {steps.length}
            </span>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(4, current + 1))}
                className="inline-flex items-center gap-1 rounded-full bg-brand px-6 py-2.5 text-sm font-black text-brand-foreground shadow-md shadow-brand/25"
              >
                Continue
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={publishListing}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-full bg-success px-6 py-2.5 text-sm font-black text-success-foreground shadow-md shadow-success/25 disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? "Publishing..." : "Publish Listing"}
              </button>
            )}
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
