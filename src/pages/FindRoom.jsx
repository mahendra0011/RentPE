import { motion } from "framer-motion";
import { Check, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import {
  getCityFromStorage,
  getCityOption,
  roomTypeOptions,
  saveCityToStorage,
} from "@/lib/listingMeta.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { createRoomSearchIndex, searchRoomIds } from "@/lib/roomSearch.js";
import { fetchRooms } from "@/store/roomsSlice.js";

const filterTypes = roomTypeOptions;
const filterGenders = ["Girls", "Boys", "Co-ed"];
const defaultPriceMax = 20000;
const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "rentLow", label: "Rent: low to high" },
  { value: "rentHigh", label: "Rent: high to low" },
  { value: "distance", label: "Nearest first" },
  { value: "rating", label: "Top rated" },
];
const initialVisibleRooms = 6;
const visibleRoomStep = 6;
const filterAmenities = [
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
  const fallbackRooms = useMemo(() => normalizeRooms(staticRooms), []);
  const rooms = apiRooms.length ? apiRooms : fallbackRooms;
  const roomSearchIndex = useMemo(() => createRoomSearchIndex(rooms), [rooms]);
  const [keywordQuery, setKeywordQuery] = useState(
    () => searchParams.get("q") || searchParams.get("location") || "",
  );
  const [selectedCity, setSelectedCity] = useState(
    () => searchParams.get("city") || getCityFromStorage(),
  );
  const [showFilters, setShowFilters] = useState(
    () =>
      searchParams.get("filters") === "1" ||
      searchParams.get("all") === "1" ||
      Boolean(searchParams.get("q")) ||
      Boolean(searchParams.get("location")) ||
      Boolean(searchParams.get("city")),
  );
  const [priceMax, setPriceMax] = useState(() =>
    Number(searchParams.get("budget") || defaultPriceMax),
  );
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [furnishedOnly, setFurnishedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortMode, setSortMode] = useState(() => searchParams.get("sort") || "recommended");
  const [visibleCount, setVisibleCount] = useState(initialVisibleRooms);
  const deferredKeywordQuery = useDeferredValue(keywordQuery);
  const selectedCityOption = getCityOption(selectedCity);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    const nextKeyword = searchParams.get("q") || searchParams.get("location");
    const nextBudget = searchParams.get("budget");
    const nextCity = searchParams.get("city");
    const nextSort = searchParams.get("sort");

    if (nextKeyword !== null) {
      setKeywordQuery(nextKeyword);
      setShowFilters(true);
    }

    if (nextBudget !== null) {
      setPriceMax(Number(nextBudget));
    }

    if (nextCity !== null) {
      const normalizedCity = getCityOption(nextCity).city;
      setSelectedCity(normalizedCity);
      saveCityToStorage(normalizedCity);
      setShowFilters(true);
    } else {
      setSelectedCity(getCityFromStorage());
    }

    if (nextSort) {
      setSortMode(nextSort);
    }

    if (searchParams.get("filters") === "1" || searchParams.get("all") === "1") {
      setShowFilters(true);
    }
  }, [searchParams]);

  const filteredRooms = useMemo(() => {
    const matchedRoomIds = searchRoomIds(roomSearchIndex, deferredKeywordQuery, rooms.length);
    const matchRank = matchedRoomIds
      ? new Map(matchedRoomIds.map((id, index) => [String(id), index]))
      : null;
    const cityFilter = selectedCityOption.city.toLowerCase();

    const nextRooms = rooms.filter((room) => {
      if (matchRank && !matchRank.has(String(room.id))) return false;
      if (cityFilter && String(room.city || "").toLowerCase() !== cityFilter) return false;
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
    });

    return sortRooms(nextRooms, sortMode, matchRank);
  }, [
    availableOnly,
    deferredKeywordQuery,
    furnishedOnly,
    priceMax,
    roomSearchIndex,
    rooms,
    selectedAmenities,
    selectedCityOption.city,
    selectedGenders,
    selectedTypes,
    sortMode,
  ]);

  useEffect(() => {
    setVisibleCount(initialVisibleRooms);
  }, [
    availableOnly,
    deferredKeywordQuery,
    furnishedOnly,
    priceMax,
    selectedAmenities,
    selectedCityOption.city,
    selectedGenders,
    selectedTypes,
    sortMode,
  ]);

  const visibleRooms = useMemo(
    () => filteredRooms.slice(0, visibleCount),
    [filteredRooms, visibleCount],
  );
  const hasMoreRooms = visibleRooms.length < filteredRooms.length;

  const activeFilterCount =
    selectedTypes.length +
    selectedGenders.length +
    selectedAmenities.length +
    Number(furnishedOnly) +
    Number(!availableOnly) +
    Number(priceMax !== defaultPriceMax) +
    Number(Boolean(keywordQuery)) +
    Number(sortMode !== "recommended");

  function onKeywordSubmit(event) {
    event.preventDefault();
    const params = buildSearchParams();
    setSearchParams(params);
  }

  function buildSearchParams() {
    const params = new URLSearchParams();
    if (keywordQuery.trim()) params.set("q", keywordQuery.trim());
    if (priceMax !== defaultPriceMax) params.set("budget", String(priceMax));
    if (selectedCityOption.city) params.set("city", selectedCityOption.city);
    if (sortMode !== "recommended") params.set("sort", sortMode);
    if (showFilters) params.set("filters", "1");
    return params;
  }

  function toggleFilter(list, value, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function resetFilters() {
    setKeywordQuery("");
    setPriceMax(defaultPriceMax);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAmenities([]);
    setFurnishedOnly(false);
    setAvailableOnly(true);
    setSortMode("recommended");
    const params = new URLSearchParams();
    if (selectedCityOption.city) params.set("city", selectedCityOption.city);
    if (showFilters) params.set("filters", "1");
    setSearchParams(params);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        <motion.section
          initial="hidden"
          animate="visible"
          variants={quickStagger}
          className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pb-20 md:pt-14"
        >
          <motion.form
            onSubmit={onKeywordSubmit}
            variants={fadeUp}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="animate-soft-pulse mx-auto max-w-[780px] rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-32px_rgba(79,70,229,0.55)] lg:rounded-full"
          >
            <div className="grid gap-2 lg:h-14 lg:grid-cols-[1fr_170px_150px] lg:items-center">
              <label className="flex min-w-0 items-center gap-3 px-4 py-3 lg:px-5 lg:py-0">
                <Search className="size-5 shrink-0 text-slate-400" />
                <input
                  value={keywordQuery}
                  onChange={(event) => setKeywordQuery(event.target.value)}
                  type="text"
                  placeholder="Search PG, flat, WiFi, landmark"
                  className="w-full bg-transparent text-sm font-black text-ink outline-none placeholder:text-slate-400"
                />
              </label>
              <label className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 lg:border-l lg:border-t-0 lg:px-5 lg:py-0">
                <select
                  value={priceMax === defaultPriceMax ? "" : String(priceMax)}
                  onChange={(event) => setPriceMax(Number(event.target.value || defaultPriceMax))}
                  className="w-full bg-transparent text-sm font-black text-slate-600 outline-none"
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
                className="animate-shimmer inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-black text-brand-foreground shadow-lg shadow-brand/30 transition-transform active:scale-95 lg:h-full"
              >
                <Search className="size-4" />
                Search
              </motion.button>
            </div>
          </motion.form>

          <motion.div variants={fadeUp} className="mt-10">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-ink">Find rooms</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Showing{" "}
                  <span className="font-black text-ink">
                    {filteredRooms.length} {filteredRooms.length === 1 ? "property" : "properties"}
                  </span>
                  {selectedCityOption.city ? ` in ${selectedCityOption.label}` : " across cities"}
                  {deferredKeywordQuery ? ` matching "${deferredKeywordQuery}"` : ""}
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
            </div>

            {showFilters && (
              <div className="mb-7 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-black text-ink">Filters</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Budget, room type, tenant and amenities apply instantly
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

                  <FilterBlock label="Room type">
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

                  <FilterBlock label="Sort">
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                      className="form-input py-2.5"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FilterBlock>
                </div>
              </div>
            )}

            {filteredRooms.length > 0 ? (
              <motion.div layout className="grid grid-cols-1 gap-7 md:grid-cols-3">
                {visibleRooms.map((room, index) => (
                  <RoomCard key={room.id} room={room} index={index % visibleRoomStep} />
                ))}
              </motion.div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
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

            {hasMoreRooms && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + visibleRoomStep)}
                  className="inline-flex items-center justify-center rounded-full bg-ink px-7 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800"
                >
                  Load more rooms
                </button>
              </div>
            )}
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}

function sortRooms(rooms, sortMode, matchRank) {
  const nextRooms = [...rooms];

  return nextRooms.sort((firstRoom, secondRoom) => {
    if (sortMode === "rentLow") return firstRoom.price - secondRoom.price;
    if (sortMode === "rentHigh") return secondRoom.price - firstRoom.price;
    if (sortMode === "distance") return firstRoom.distanceKm - secondRoom.distanceKm;
    if (sortMode === "rating") {
      return (secondRoom.owner?.rating || 0) - (firstRoom.owner?.rating || 0);
    }
    if (matchRank) {
      return matchRank.get(String(firstRoom.id)) - matchRank.get(String(secondRoom.id));
    }

    if (firstRoom.availability !== secondRoom.availability) {
      return firstRoom.availability === "available" ? -1 : 1;
    }

    return (secondRoom.owner?.rating || 0) - (firstRoom.owner?.rating || 0);
  });
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
            {active && <Check className="mr-1 inline size-3" />}
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
