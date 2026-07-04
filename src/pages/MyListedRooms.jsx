import {
  Building2,
  Camera,
  Check,
  Crosshair,
  Edit3,
  Eye,
  ImagePlus,
  MapPin,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import { apiRequest } from "@/lib/api.js";
import { formatPrice } from "@/lib/format.js";
import {
  getCityOption,
  getRoomTypeMeta,
  listingCityOptions,
  roomTypeOptions,
} from "@/lib/listingMeta.js";
import { formatCoordinate, geocodeAddress } from "@/lib/mapServices.js";
import { normalizeRoom, normalizeRooms } from "@/lib/roomAdapter.js";
import { addRuleLine, roomRuleSuggestions } from "@/lib/rules.js";

const amenityOptions = [
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

const emptyForm = {
  title: "",
  type: "Single Room",
  gender: "Co-ed",
  price: "",
  description: "",
  rules: "",
  amenities: [],
  address: "",
  city: "",
  state: "",
  landmark: "",
  longitude: "",
  latitude: "",
  ownerName: "",
  phone: "",
  whatsapp: true,
  furnished: true,
  availability: "available",
};

export default function MyListedRooms() {
  const user = useSelector((state) => state.auth.user);
  const isOwner = user?.role === "owner";
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  const selectedRoom = rooms.find((room) => room.id === selectedId || room.slug === selectedId);
  const photoPreviews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  const visibleImages = photoPreviews.length ? photoPreviews : selectedRoom?.images || [];
  const availableCount = rooms.filter((room) => room.availability === "available").length;
  const occupiedCount = rooms.filter((room) => room.availability === "occupied").length;
  const averageRent = rooms.length
    ? Math.round(rooms.reduce((sum, room) => sum + Number(room.price || 0), 0) / rooms.length)
    : 0;

  useEffect(() => {
    if (!isOwner) return;
    loadRooms();
  }, [isOwner]);

  useEffect(() => {
    if (selectedRoom) {
      setForm(roomToForm(selectedRoom));
      setPhotos([]);
      setSaved("");
      setLocationMessage("");
      setDeleteConfirmId("");
    }
  }, [selectedRoom]);

  async function loadRooms() {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest("/api/rooms/mine");
      const nextRooms = normalizeRooms(payload);
      setRooms(nextRooms);
      setSelectedId((current) => current || nextRooms[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved("");
    setDeleteNotice("");
    if (["address", "city", "landmark", "longitude", "latitude"].includes(key)) {
      setLocationMessage("");
    }
    setDeleteConfirmId("");
  }

  function updateCity(value) {
    const option = getCityOption(value);
    setForm((current) => ({ ...current, city: option.city, state: option.state }));
    setSaved("");
    setDeleteNotice("");
    setLocationMessage("");
    setDeleteConfirmId("");
  }

  function toggleAmenity(amenity) {
    update(
      "amenities",
      form.amenities.includes(amenity)
        ? form.amenities.filter((item) => item !== amenity)
        : [...form.amenities, amenity],
    );
  }

  function onFiles(files) {
    if (!files) return;
    setPhotos(Array.from(files).slice(0, 8));
    setSaved("");
    setDeleteNotice("");
    setDeleteConfirmId("");
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!selectedRoom) return;

    setSaving(true);
    setError("");
    setSaved("");
    setDeleteNotice("");

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        payload.append(key, value);
      });
      photos.forEach((file) => payload.append("photos", file));

      const updated = normalizeRoom(
        await apiRequest(`/api/rooms/${selectedRoom.slug || selectedRoom.id}`, {
          method: "PATCH",
          body: payload,
        }),
      );

      setRooms((current) => current.map((room) => (room.id === selectedRoom.id ? updated : room)));
      setSelectedId(updated.id);
      setPhotos([]);
      setSaved("Listing updated successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function findCoordinates() {
    setGeocoding(true);
    setError("");
    setLocationMessage("");

    try {
      const result = await geocodeAddress(
        [form.address, form.landmark, form.city, form.state].filter(Boolean).join(", "),
      );
      setForm((current) => ({
        ...current,
        longitude: String(result.longitude),
        latitude: String(result.latitude),
      }));
      setLocationMessage(result.label);
    } catch (geocodeError) {
      setLocationMessage(geocodeError.message);
    } finally {
      setGeocoding(false);
    }
  }

  function useCurrentLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("Current location is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          longitude: String(position.coords.longitude),
          latitude: String(position.coords.latitude),
        }));
        setLocationMessage("Current location added.");
      },
      () => setLocationMessage("Location permission was not allowed."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function deleteListing() {
    if (!selectedRoom) return;

    const listingId = selectedRoom.slug || selectedRoom.id;
    if (deleteConfirmId !== listingId) {
      setDeleteConfirmId(listingId);
      setError("");
      setSaved("");
      setDeleteNotice("");
      return;
    }

    setDeletingId(listingId);
    setError("");
    setSaved("");
    setDeleteNotice("");

    try {
      await apiRequest(`/api/rooms/${listingId}`, { method: "DELETE" });

      const selectedIndex = rooms.findIndex(
        (room) => room.id === selectedRoom.id || room.slug === selectedRoom.slug,
      );
      const nextRooms = rooms.filter(
        (room) => room.id !== selectedRoom.id && room.slug !== selectedRoom.slug,
      );
      const nextSelectedRoom = nextRooms[Math.min(selectedIndex, nextRooms.length - 1)];

      setRooms(nextRooms);
      setSelectedId(nextSelectedRoom?.id || "");
      setPhotos([]);
      setDeleteConfirmId("");
      setDeleteNotice("Listing deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background font-sans text-ink">
        <SiteHeader />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4 py-16 sm:px-6">
          <section className="w-full rounded-[28px] border border-slate-200 bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Building2 className="size-8" />
            </span>
            <h1 className="text-3xl font-black tracking-normal">Owner login required.</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              Login as a room owner to manage your posted rooms.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/login?owner=1"
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-black text-brand-foreground"
              >
                Owner Login
              </Link>
              <Link
                to="/signup?owner=1"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-black"
              >
                Sign Up
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex rounded-full bg-brand-soft px-4 py-1 text-xs font-black uppercase tracking-wide text-brand">
              Owner panel
            </span>
            <h1 className="text-3xl font-black tracking-normal md:text-4xl">My Listed Rooms</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Update rent, address, rules, amenities, availability, contact number, and photos.
            </p>
          </div>
          <Link
            to="/list-room"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-black text-background"
          >
            <ImagePlus className="size-4" />
            Add another room
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {deleteNotice && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {deleteNotice}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-card p-10 text-center font-black">
            Loading your listings...
          </div>
        ) : rooms.length === 0 ? (
          <EmptyOwnerState />
        ) : (
          <>
            <section className="mb-8 grid gap-4 md:grid-cols-4">
              <OwnerMetric label="Live listings" value={rooms.length} />
              <OwnerMetric label="Available" value={availableCount} />
              <OwnerMetric label="Occupied" value={occupiedCount} />
              <OwnerMetric label="Avg rent" value={formatPrice(averageRent)} />
            </section>

            <section className="grid gap-8 lg:grid-cols-[360px_1fr]">
              <aside className="space-y-3">
                {rooms.map((room) => {
                  const active = room.id === selectedId || room.slug === selectedId;
                  const meta = getRoomTypeMeta(room.type);

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedId(room.id)}
                      className={`w-full rounded-2xl border bg-card p-3 text-left transition-colors ${
                        active ? "border-brand shadow-[var(--shadow-card)]" : "border-slate-200"
                      }`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={room.coverImage}
                          alt=""
                          className="size-20 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{room.title}</p>
                          <p className="mt-1 truncate text-xs font-bold text-slate-500">
                            {room.location}
                          </p>
                          <span
                            className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black"
                            style={{ backgroundColor: meta.softColor, color: meta.textColor }}
                          >
                            {meta.label}
                          </span>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-brand">
                              {formatPrice(room.price)}
                            </span>
                            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-black uppercase text-brand">
                              {room.availability}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </aside>

              <form
                onSubmit={saveListing}
                className="rounded-[28px] border border-slate-200 bg-card p-5 shadow-[var(--shadow-card)] sm:p-8"
              >
                <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black tracking-normal">Edit listing</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      New photo upload replaces old listing photos.
                    </p>
                  </div>
                  {selectedRoom && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/rooms/${selectedRoom.slug || selectedRoom.id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-black text-ink hover:border-brand hover:text-brand"
                      >
                        <Eye className="size-4" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={deleteListing}
                        disabled={Boolean(deletingId)}
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-black transition-colors disabled:cursor-wait disabled:opacity-70 ${
                          deleteConfirmId === (selectedRoom.slug || selectedRoom.id)
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <Trash2 className="size-4" />
                        {deletingId === (selectedRoom.slug || selectedRoom.id)
                          ? "Deleting..."
                          : deleteConfirmId === (selectedRoom.slug || selectedRoom.id)
                            ? "Confirm delete"
                            : "Delete"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {visibleImages.slice(0, 8).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="aspect-square overflow-hidden rounded-2xl bg-slate-100"
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center transition-colors hover:border-brand hover:bg-brand-soft/40">
                    <Camera className="mb-2 size-6 text-slate-400" />
                    <span className="px-3 text-xs font-black text-slate-600">Replace photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => onFiles(event.target.files)}
                    />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Listing title">
                    <input
                      value={form.title}
                      onChange={(event) => update("title", event.target.value)}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Monthly rent">
                    <input
                      type="number"
                      value={form.price}
                      onChange={(event) => update("price", event.target.value)}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Property type">
                    <select
                      value={form.type}
                      onChange={(event) => update("type", event.target.value)}
                      className="form-input"
                    >
                      {roomTypeOptions.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tenant">
                    <select
                      value={form.gender}
                      onChange={(event) => update("gender", event.target.value)}
                      className="form-input"
                    >
                      <option>Co-ed</option>
                      <option>Girls</option>
                      <option>Boys</option>
                    </select>
                  </Field>
                  <Field label="City">
                    <select
                      value={form.city}
                      onChange={(event) => updateCity(event.target.value)}
                      className="form-input"
                    >
                      <option value="">Select city and state</option>
                      {listingCityOptions.map((option) => (
                        <option key={option.label} value={option.city}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Landmark">
                    <input
                      value={form.landmark}
                      onChange={(event) => update("landmark", event.target.value)}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Full address">
                    <input
                      value={form.address}
                      onChange={(event) => update("address", event.target.value)}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Owner phone">
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        update("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className="form-input"
                    />
                  </Field>
                  <Field label="Coordinates">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={findCoordinates}
                        disabled={geocoding}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
                      >
                        <MapPin className="size-4" />
                        {geocoding ? "Finding..." : "Find"}
                      </button>
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-ink hover:border-brand hover:text-brand"
                      >
                        <Crosshair className="size-4" />
                        Current
                      </button>
                    </div>
                    {(form.longitude && form.latitude) || locationMessage ? (
                      <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
                        {form.longitude && form.latitude ? (
                          <span className="block text-ink">
                            {formatCoordinate(form.latitude)}, {formatCoordinate(form.longitude)}
                          </span>
                        ) : null}
                        {locationMessage && <span className="block">{locationMessage}</span>}
                      </p>
                    ) : null}
                  </Field>
                  <Field label="Owner name">
                    <input
                      value={form.ownerName}
                      onChange={(event) => update("ownerName", event.target.value)}
                      className="form-input"
                    />
                  </Field>
                  <Field label="Availability">
                    <select
                      value={form.availability}
                      onChange={(event) => update("availability", event.target.value)}
                      className="form-input"
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                    </select>
                  </Field>
                </div>

                <Field label="Description" className="mt-5">
                  <textarea
                    value={form.description}
                    onChange={(event) => update("description", event.target.value)}
                    rows={4}
                    className="form-input resize-none"
                  />
                </Field>

                <Field label="House rules" className="mt-5">
                  <textarea
                    value={form.rules}
                    onChange={(event) => update("rules", event.target.value)}
                    rows={3}
                    placeholder="One rule per line"
                    className="form-input resize-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roomRuleSuggestions.map((rule) => (
                      <button
                        type="button"
                        key={rule}
                        onClick={() => update("rules", addRuleLine(form.rules, rule))}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:border-brand hover:text-brand"
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="mt-5 grid gap-5 md:grid-cols-[1fr_260px]">
                  <Field label="Amenities">
                    <div className="flex flex-wrap gap-2">
                      {amenityOptions.map((amenity) => {
                        const active = form.amenities.includes(amenity);
                        return (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => toggleAmenity(amenity)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
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
                  <Field label="Controls">
                    <div className="space-y-2">
                      <Toggle
                        label="Furnished"
                        checked={form.furnished}
                        onChange={(value) => update("furnished", value)}
                      />
                      <Toggle
                        label="WhatsApp leads"
                        checked={form.whatsapp}
                        onChange={(value) => update("whatsapp", value)}
                      />
                      <Toggle
                        label="In-App Chat"
                        checked={form.chatEnabled}
                        onChange={(value) => update("chatEnabled", value)}
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {saved && (
                      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                        <Check className="size-4" />
                        {saved}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving || Boolean(deletingId)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 disabled:cursor-wait disabled:opacity-70"
                  >
                    {saving ? <Edit3 className="size-4" /> : <Save className="size-4" />}
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function roomToForm(room) {
  return {
    title: room.title || "",
    type: room.type || "Single Room",
    gender: room.gender || "Co-ed",
    price: room.price || "",
    description: room.description || "",
    rules: (room.rules || []).join("\n"),
    amenities: room.amenities || [],
    address: room.address || "",
    city: room.city || "",
    state: room.state || "",
    landmark: room.landmark || "",
    longitude: room.geoCoordinates?.[0] || "",
    latitude: room.geoCoordinates?.[1] || "",
    ownerName: room.owner?.name || "",
    phone: String(room.owner?.phone || "")
      .replace(/^91/, "")
      .slice(-10),
    chatEnabled: room.chatEnabled !== false,
    whatsapp: room.owner?.whatsapp !== false,
    furnished: room.furnished !== false,
    availability: room.availability || "available",
  };
}

function OwnerMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-card p-5 shadow-sm">
      <p className="text-2xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-black">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-brand"
      />
    </label>
  );
}

function EmptyOwnerState() {
  return (
    <section className="rounded-[28px] border border-dashed border-slate-200 bg-card p-10 text-center">
      <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <X className="size-8" />
      </span>
      <h2 className="text-2xl font-black tracking-normal">No rooms listed yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        List your first room, then it will appear here for editing photos, price, availability, and
        contact details.
      </p>
      <Link
        to="/list-room"
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand px-7 text-sm font-black text-brand-foreground"
      >
        List your room
      </Link>
    </section>
  );
}
