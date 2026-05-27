import { motion } from "framer-motion";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms } from "@/store/roomsSlice.js";

const filterTypes = ["PG", "Hostel", "Flat"];
const filterGenders = ["Girls", "Boys", "Co-ed"];
const filterAmenities = ["WiFi", "AC", "Parking", "Mess", "Lift", "CCTV"];
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};
const quickStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.08 },
  },
};

export default function FindRoom() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const apiRooms = useSelector((state) => state.rooms.items);
  const rooms = apiRooms.length ? apiRooms : normalizeRooms(staticRooms);
  const [keywordQuery, setKeywordQuery] = useState(
    () => searchParams.get("q") || searchParams.get("location") || "",
  );
  const [showFilters, setShowFilters] = useState(
    () =>
      searchParams.get("filters") === "1" ||
      searchParams.get("all") === "1" ||
      Boolean(searchParams.get("q")) ||
      Boolean(searchParams.get("location")),
  );
  const [priceMax, setPriceMax] = useState(() => Number(searchParams.get("budget") || 20000));
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [furnishedOnly, setFurnishedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    const nextKeyword = searchParams.get("q") || searchParams.get("location");
    const nextBudget = searchParams.get("budget");

    if (nextKeyword !== null) {
      setKeywordQuery(nextKeyword);
      setShowFilters(true);
    }

    if (nextBudget !== null) {
      setPriceMax(Number(nextBudget));
    }

    if (searchParams.get("filters") === "1" || searchParams.get("all") === "1") {
      setShowFilters(true);
    }
  }, [searchParams]);

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const haystack = [
          room.city,
          room.location,
          room.address,
          room.landmark,
          room.title,
          room.description,
          room.type,
          room.gender,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ");
        const queryTerms = keywordQuery
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
      furnishedOnly,
      keywordQuery,
      priceMax,
      rooms,
      selectedAmenities,
      selectedGenders,
      selectedTypes,
    ],
  );

  const activeFilterCount =
    selectedTypes.length +
    selectedGenders.length +
    selectedAmenities.length +
    Number(furnishedOnly) +
    Number(!availableOnly) +
    Number(priceMax !== 20000) +
    Number(Boolean(keywordQuery));

  function onKeywordSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keywordQuery.trim()) params.set("q", keywordQuery.trim());
    if (priceMax !== 20000) params.set("budget", String(priceMax));
    if (showFilters) params.set("filters", "1");
    setSearchParams(params);
  }

  function toggleFilter(list, value, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function resetFilters() {
    setKeywordQuery("");
    setPriceMax(20000);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAmenities([]);
    setFurnishedOnly(false);
    setAvailableOnly(true);
    setSearchParams(showFilters ? { filters: "1" } : {});
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <motion.section
          initial="hidden"
          animate="visible"
          variants={quickStagger}
          className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 md:pb-20 md:pt-16"
        >
          <motion.form
            onSubmit={onKeywordSubmit}
            variants={fadeUp}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="animate-soft-pulse mx-auto max-w-[760px] rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-32px_rgba(79,70,229,0.55)] md:rounded-full"
          >
            <div className="flex flex-col gap-2 md:h-14 md:flex-row md:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 md:px-5 md:py-0">
                <Search className="size-5 shrink-0 text-slate-400" />
                <input
                  value={keywordQuery}
                  onChange={(event) => setKeywordQuery(event.target.value)}
                  type="text"
                  placeholder="Search keyword: PG, hostel, flat, WiFi"
                  className="w-full bg-transparent text-sm font-black text-ink outline-none placeholder:text-slate-400"
                />
              </label>
              <div className="hidden h-8 w-px bg-slate-200 md:block" />
              <label className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-0">
                <select
                  value={priceMax === 20000 ? "" : String(priceMax)}
                  onChange={(event) => setPriceMax(Number(event.target.value || 20000))}
                  className="bg-transparent text-sm font-black text-slate-600 outline-none"
                  aria-label="Budget"
                >
                  <option value="">Any Budget</option>
                  <option value="5000">Under Rs. 5,000</option>
                  <option value="10000">Rs. 5k - Rs. 10k</option>
                  <option value="20000">Rs. 10k - Rs. 20k</option>
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

          <motion.div variants={fadeUp} className="mt-14">
            <motion.div
              variants={fadeUp}
              className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
            >
              <div>
                <h1 className="text-3xl font-black tracking-normal text-ink">Find rooms</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Showing{" "}
                  <span className="font-black text-ink">{filteredRooms.length} properties</span>
                  {keywordQuery ? ` matching "${keywordQuery}"` : " from RentPE listings"}
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
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </button>
              </div>
            </motion.div>

            {showFilters && (
              <div className="mb-7 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-black text-ink">Filters</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Keyword, budget and room preferences apply instantly
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-black text-brand"
                  >
                    Reset filters
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
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

                  <FilterBlock label="Availability">
                    <div className="flex flex-wrap gap-2">
                      <CheckboxFilter
                        label="Furnished"
                        checked={furnishedOnly}
                        onChange={setFurnishedOnly}
                      />
                      <CheckboxFilter
                        label="Available"
                        checked={availableOnly}
                        onChange={setAvailableOnly}
                      />
                    </div>
                  </FilterBlock>
                </div>
              </div>
            )}

            <motion.div layout className="grid grid-cols-1 gap-7 md:grid-cols-3">
              {filteredRooms.map((room, index) => (
                <RoomCard key={room.id} room={room} index={index} />
              ))}
              {filteredRooms.length === 0 && (
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
            </motion.div>
          </motion.div>
        </motion.section>
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

function CheckboxFilter({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 transition-colors hover:border-brand hover:text-brand">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-brand"
      />
      <span>{label}</span>
    </label>
  );
}
