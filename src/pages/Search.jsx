import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

import RoomCard from "@/components/RoomCard.jsx";
import SiteHeader from "@/components/SiteHeader.jsx";
import { rooms as staticRooms } from "@/data/rooms.js";
import { normalizeRooms } from "@/lib/roomAdapter.js";
import { fetchRooms, searchNearbyRooms } from "@/store/roomsSlice.js";

const types = ["PG", "Hostel", "Flat"];
const genders = ["Girls", "Boys", "Co-ed"];
const amenities = ["WiFi", "AC", "Parking", "Mess", "Lift", "CCTV", "Geyser"];

function queryFromParams(params) {
  const showAll = params.get("all") === "1" || params.get("filters") === "1";
  return showAll ? "" : params.get("query") || params.get("city") || "";
}

export default function Search() {
  const [params] = useSearchParams();
  const paramsKey = params.toString();
  const dispatch = useDispatch();
  const { items: apiRooms, origin, status, error } = useSelector((state) => state.rooms);
  const [query, setQuery] = useState(queryFromParams(params));
  const [priceMax, setPriceMax] = useState(20000);
  const [distMax, setDistMax] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [furnishedOnly, setFurnishedOnly] = useState(false);
  const [openFilters, setOpenFilters] = useState(params.get("filters") === "1");
  const sourceRooms = apiRooms.length ? apiRooms : normalizeRooms(staticRooms);

  useEffect(() => {
    const filters = {
      priceMax,
      types: selectedTypes,
      genders: selectedGenders,
      amenities: selectedAmenities,
      furnishedOnly,
      availableOnly: true,
    };

    if (query.trim()) {
      dispatch(
        searchNearbyRooms({
          ...filters,
          query,
          maxDistance: distMax * 1000,
        }),
      );
      return;
    }

    dispatch(fetchRooms(filters));
  }, [
    dispatch,
    distMax,
    furnishedOnly,
    priceMax,
    query,
    selectedAmenities,
    selectedGenders,
    selectedTypes,
  ]);

  useEffect(() => {
    const nextParams = new URLSearchParams(paramsKey);
    setQuery(queryFromParams(nextParams));
    if (nextParams.get("filters") === "1") {
      setOpenFilters(true);
    }
  }, [paramsKey]);

  const filtered = useMemo(
    () =>
      sourceRooms.filter((room) => {
        const queryMatch = `${room.city} ${room.location} ${room.address} ${room.title}`
          .toLowerCase()
          .includes(query.toLowerCase());

        if (query.trim() && !queryMatch) return false;
        if (room.price > priceMax) return false;
        if (room.distanceKm > distMax) return false;
        if (selectedTypes.length && !selectedTypes.includes(room.type)) return false;
        if (selectedGenders.length && !selectedGenders.includes(room.gender)) return false;
        if (furnishedOnly && !room.furnished) return false;
        if (
          selectedAmenities.length &&
          !selectedAmenities.every((amenity) => room.amenities.includes(amenity))
        ) {
          return false;
        }

        return true;
      }),
    [
      distMax,
      furnishedOnly,
      priceMax,
      query,
      selectedAmenities,
      selectedGenders,
      selectedTypes,
      sourceRooms,
    ],
  );

  function toggle(list, value, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function reset() {
    setPriceMax(20000);
    setDistMax(5);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAmenities([]);
    setFurnishedOnly(false);
  }

  function applyFilters() {
    setOpenFilters(false);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <div className="border-b border-slate-200 bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-4 sm:px-6">
          <label className="flex max-w-2xl flex-1 items-center gap-3 rounded-full border border-slate-200 bg-background px-5 py-2.5">
            <SearchIcon className="size-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold outline-none"
              placeholder="City, area, college or office"
            />
          </label>
          <button
            type="button"
            onClick={() => setOpenFilters(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-card px-4 py-2.5 text-sm font-black lg:hidden"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside
          className={`${
            openFilters ? "fixed inset-0 z-50 overflow-auto bg-background p-6" : "hidden"
          } lg:static lg:block lg:p-0`}
        >
          <div className="mb-5 flex items-center justify-between lg:mb-4">
            <h2 className="text-lg font-black">Filters</h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={reset} className="text-xs font-black text-brand">
                Reset
              </button>
              <button
                type="button"
                onClick={() => setOpenFilters(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-100 lg:hidden"
                aria-label="Close filters"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
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

            <FilterBlock label={`Max distance - ${distMax} km`}>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={distMax}
                onChange={(event) => setDistMax(Number(event.target.value))}
                className="w-full accent-brand"
              />
            </FilterBlock>

            <FilterBlock label="Property type">
              <ChipRow
                items={types}
                selected={selectedTypes}
                onToggle={(value) => toggle(selectedTypes, value, setSelectedTypes)}
              />
            </FilterBlock>

            <FilterBlock label="Tenant">
              <ChipRow
                items={genders}
                selected={selectedGenders}
                onToggle={(value) => toggle(selectedGenders, value, setSelectedGenders)}
              />
            </FilterBlock>

            <FilterBlock label="Amenities">
              <ChipRow
                items={amenities}
                selected={selectedAmenities}
                onToggle={(value) => toggle(selectedAmenities, value, setSelectedAmenities)}
              />
            </FilterBlock>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={furnishedOnly}
                onChange={(event) => setFurnishedOnly(event.target.checked)}
                className="size-4 accent-brand"
              />
              <span className="text-sm font-bold">Furnished only</span>
            </label>

            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-black text-brand-foreground shadow-md shadow-brand/25 lg:hidden"
            >
              Apply filters
            </button>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h1 className="text-xl font-black">
                {filtered.length} rooms {query ? `in ${query}` : "available"}
              </h1>
              <p className="text-sm text-slate-500">
                {query ? origin?.label || "Sorted by distance, nearest first" : "Showing all rooms"}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              {error}. Showing local demo rooms.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {status === "loading" && filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-card p-6 text-sm font-bold text-slate-500">
                Searching rooms...
              </div>
            )}
            {filtered.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <p className="mb-1 font-black">No rooms match your filters</p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-2 text-sm font-black text-brand"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
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
