import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

const filterTypes = ["PG", "Hostel", "Flat"];
const filterGenders = ["Girls", "Boys", "Co-ed"];
const filterAmenities = ["WiFi", "AC", "Parking", "Mess", "Lift", "CCTV"];
const quickLocations = [
  "Near LNCT",
  "MP Nagar",
  "Arera Colony",
  "Gulmohar Colony",
  "Indrapuri",
  "Kolar Road",
  "Habibganj",
];
const cityFilters = ["Bhopal", "Indore", "Pune", "Bangalore", "Delhi NCR"];

export default function FindRoom() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const apiRooms = useSelector((state) => state.rooms.items);
  const rooms = apiRooms.length ? apiRooms : normalizeRooms(staticRooms);
  const [locationQuery, setLocationQuery] = useState(() => searchParams.get("location") || "");
  const [priceMax, setPriceMax] = useState(() => Number(searchParams.get("budget") || 20000));
  const [distanceMax, setDistanceMax] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [furnishedOnly, setFurnishedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    const nextLocation = searchParams.get("location");
    const nextBudget = searchParams.get("budget");

    if (nextLocation !== null) {
      setLocationQuery(nextLocation);
    }

    if (nextBudget !== null) {
      setPriceMax(Number(nextBudget));
    }
  }, [searchParams]);

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const haystack = `${room.city} ${room.location} ${room.address} ${room.title}`
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ");
        const queryTerms = locationQuery
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((term) => term.length > 2 && !["near", "room", "rooms"].includes(term));
        const queryMatch =
          !queryTerms.length || queryTerms.some((term) => haystack.includes(term));

        if (!queryMatch) return false;
        if (room.price > priceMax) return false;
        if (room.distanceKm && room.distanceKm > distanceMax) return false;
        if (selectedTypes.length && !selectedTypes.includes(room.type)) return false;
        if (selectedGenders.length && !selectedGenders.includes(room.gender)) return false;
        if (furnishedOnly && !room.furnished) return false;
        if (availableOnly && room.availability === "occupied") return false;
        if (
          selectedAmenities.length &&
          !selectedAmenities.every((amenity) => room.amenities.includes(amenity))
        ) {
          return false;
        }

        return true;
      }),
    [
      availableOnly,
      distanceMax,
      furnishedOnly,
      locationQuery,
      priceMax,
      rooms,
      selectedAmenities,
      selectedGenders,
      selectedTypes,
    ],
  );

  function onLocationSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (locationQuery.trim()) params.set("location", locationQuery.trim());
    if (priceMax !== 20000) params.set("budget", String(priceMax));
    setSearchParams(params);
  }

  function chooseLocation(location) {
    setLocationQuery(location);
    const params = new URLSearchParams(searchParams);
    params.set("location", location);
    setSearchParams(params);
  }

  function toggleFilter(list, value, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function resetFilters() {
    setLocationQuery("");
    setPriceMax(20000);
    setDistanceMax(5);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAmenities([]);
    setFurnishedOnly(false);
    setAvailableOnly(true);
    setSearchParams({});
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_0.75fr] md:items-end md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <span className="inline-flex rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
                Find Room
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-ink md:text-5xl">
                Search all rooms with location-first filters.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
                Pick an area, college, office, or city. Then narrow the list by budget, distance,
                tenant type, room type, and amenities.
              </p>
            </motion.div>

            <div className="rounded-[24px] border border-slate-200 bg-background p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <p className="text-3xl font-black text-brand">{filteredRooms.length}</p>
                  <p className="text-sm font-bold text-slate-500">matching rooms right now</p>
                </div>
              </div>
              <Link
                to="/signup?owner=1"
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-black text-white transition-colors hover:bg-slate-800"
              >
                List your room
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <form onSubmit={onLocationSubmit} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-background px-4">
                <MapPin className="size-5 shrink-0 text-slate-400" />
                <input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  type="text"
                  placeholder="Search city, area, college or office"
                  className="w-full bg-transparent text-sm font-black text-ink outline-none placeholder:text-slate-400"
                />
              </label>
              <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand px-7 text-sm font-black text-brand-foreground shadow-lg shadow-brand/20 transition-transform active:scale-95">
                <Search className="size-4" />
                Apply location
              </button>
            </form>

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <FilterBlock label="Quick locations">
                <ChipRow items={quickLocations} selected={[locationQuery]} onToggle={chooseLocation} />
              </FilterBlock>
              <FilterBlock label="Cities">
                <ChipRow items={cityFilters} selected={[locationQuery]} onToggle={chooseLocation} />
              </FilterBlock>
            </div>
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-[320px_1fr]">
            <aside className="h-fit rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-black text-ink">
                    <SlidersHorizontal className="size-4" />
                    Filters
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Applied instantly on this page
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-brand"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </button>
              </div>

              <div className="space-y-6">
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

                <FilterBlock label={`${distanceMax} km from location`}>
                  <div className="flex items-center gap-3">
                    <LocateFixed className="size-4 text-slate-400" />
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={distanceMax}
                      onChange={(event) => setDistanceMax(Number(event.target.value))}
                      className="w-full accent-brand"
                    />
                  </div>
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

                <div className="grid gap-3">
                  <CheckboxFilter
                    label="Furnished only"
                    checked={furnishedOnly}
                    onChange={setFurnishedOnly}
                  />
                  <CheckboxFilter
                    label="Available only"
                    checked={availableOnly}
                    onChange={setAvailableOnly}
                  />
                </div>
              </div>
            </aside>

            <div>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-normal text-ink">All room rents</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Showing{" "}
                    <span className="font-black text-ink">{filteredRooms.length}</span> rooms
                    {locationQuery ? ` around ${locationQuery}` : ""}
                  </p>
                </div>
                <p className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500">
                  No map clutter. Just rooms.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
                {filteredRooms.map((room, index) => (
                  <RoomCard key={room.id} room={room} index={index} />
                ))}
              </div>

              {filteredRooms.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white py-16 text-center">
                  <p className="font-black text-ink">No rooms match these filters</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Try a wider distance, higher budget, or a nearby area.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-black text-white"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
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
            className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
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

function CheckboxFilter({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-background px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-brand"
      />
      <span className="text-sm font-black text-slate-700">{label}</span>
    </label>
  );
}
