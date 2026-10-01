import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { fetchRooms } from "../store/roomsSlice";
import { toggleSaved } from "../store/wishlistSlice";
import { COLORS } from "../theme";
import { RoomCard } from "../components/RoomCard";
import { SiteHeader } from "../components/SiteHeader";
import { cityCoordinates } from "../lib/listingMeta";
import { normalizeRooms } from "../lib/roomAdapter";
import { createRoomSearchIndex, searchRoomIds } from "../lib/roomSearch";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Compass,
  MapPin,
  LocateFixed,
  Loader2,
  Check,
} from "lucide-react-native";

// ── constants mirrored from website src/pages/FindRoom.jsx ──
export const distanceFilterOptions = [
  { value: "all", label: "All distances" },
  { value: "under_3", label: "< 3 km", maxKm: 3 },
  { value: "under_4", label: "< 4 km", maxKm: 4 },
  { value: "under_5", label: "< 5 km", maxKm: 5 },
  { value: "under_10", label: "< 10 km", maxKm: 10 },
  { value: "over_5", label: "> 5 km", minKm: 5 },
];

const filterTypes = ["Single Room", "PG", "Shared Room", "Flat", "Hostel"];
const filterGenders = ["Girls", "Boys", "Co-ed"];
const defaultPriceMax = 20000;
const priceMin = 2000;
const priceMaxLimit = 30000;
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
const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "rentLow", label: "Rent: low to high" },
  { value: "rentHigh", label: "Rent: high to low" },
  { value: "distance", label: "Nearest first" },
  { value: "rating", label: "Top rated" },
];

// cityCoordinates now unified from src/lib/listingMeta (35 entries)

function getCityCoords(city) {
  if (!city) return null;
  const clean = String(city).trim().toLowerCase();
  for (const [k, v] of Object.entries(cityCoordinates)) {
    if (k.toLowerCase() === clean) return { longitude: v[0], latitude: v[1] };
  }
  return null;
}

function calcHaversine(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((n) => n == null || isNaN(Number(n)))) return null;
  const R = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function getRoomDistance(room, userCoords) {
  if (!userCoords) return room?.distanceKm ?? null;
  let lng = null;
  let lat = null;
  if (room?.location?.coordinates?.length === 2) [lng, lat] = room.location.coordinates;
  else if (Array.isArray(room?.geoCoordinates) && room.geoCoordinates.length === 2) [lng, lat] = room.geoCoordinates;
  else if (Array.isArray(room?.coords) && room.coords.length === 2) [lng, lat] = room.coords;
  if (lat == null || lng == null) return room?.distanceKm ?? null;
  const d = calcHaversine(userCoords.latitude, userCoords.longitude, Number(lat), Number(lng));
  return d ?? room?.distanceKm ?? null;
}

function enrichRooms(rooms, userCoords) {
  // Unified via normalizeRooms (5 distance fallbacks, owner normalization, image fallback)
  return normalizeRooms(rooms, userCoords);
}

function sortRooms(list, sortMode) {
  const next = [...list];
  return next.sort((a, b) => {
    if (sortMode === "rentLow") return (a.price || 0) - (b.price || 0);
    if (sortMode === "rentHigh") return (b.price || 0) - (a.price || 0);
    if (sortMode === "distance") {
      const d1 = Number.isFinite(a.distanceKm) ? a.distanceKm : 999999;
      const d2 = Number.isFinite(b.distanceKm) ? b.distanceKm : 999999;
      return d1 - d2;
    }
    if (sortMode === "rating") return (b.owner?.rating || 0) - (a.owner?.rating || 0);
    if (a.availability !== b.availability) return a.availability === "available" ? -1 : 1;
    return (b.owner?.rating || 0) - (a.owner?.rating || 0);
  });
}

export default function FindRoomsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: apiRooms, loading } = useSelector((state) => state.rooms);
  const savedIds = useSelector((state) => state.wishlist.savedIds);

  // Filters mirroring website state
  const [keywordQuery, setKeywordQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedDistance, setSelectedDistance] = useState("all");
  const [priceMax, setPriceMax] = useState(defaultPriceMax);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [furnishedOnly, setFurnishedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortMode, setSortMode] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(initialVisibleRooms);

  // GPS – stub with expo-location if available, else city-center fallback
  const [userCoords, setUserCoords] = useState(() => getCityCoords("Bhopal"));
  const [isGps, setIsGps] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    dispatch(fetchRooms({}));
  }, [dispatch]);

  // update coords when city changes if not GPS
  useEffect(() => {
    if (!isGps) {
      const c = getCityCoords(cityQuery || "Bhopal");
      if (c) setUserCoords(c);
    }
  }, [cityQuery, isGps]);

  async function detectLocation() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      // try expo-location dynamically to avoid crash if not installed
      let Location = null;
      try {
        Location = require("expo-location");
      } catch {
        Location = null;
      }
      if (Location && Location.requestForegroundPermissionsAsync) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Location permission denied");
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy ? Location.Accuracy.Balanced : 3 });
        const coords = { latitude: Number(pos.coords.latitude.toFixed(5)), longitude: Number(pos.coords.longitude.toFixed(5)) };
        setUserCoords(coords);
        setIsGps(true);
        setLocationLoading(false);
        return;
      }
      // fallback: simulate GPS near Bhopal
      setTimeout(() => {
        setUserCoords({ latitude: 23.2599 + (Math.random() - 0.5) * 0.05, longitude: 77.4126 + (Math.random() - 0.5) * 0.05 });
        setIsGps(true);
        setLocationLoading(false);
      }, 600);
    } catch (e) {
      setLocationLoading(false);
      setLocationError(e?.message || "Location access denied. Tap to retry.");
      setIsGps(false);
    }
  }

  function toggleFilter(list, value, setter) {
    setter(list.includes(value) ? list.filter((i) => i !== value) : [...list, value]);
  }

  function resetFilters() {
    setKeywordQuery("");
    setCityQuery("");
    setSelectedDistance("all");
    setPriceMax(defaultPriceMax);
    setSelectedTypes([]);
    setSelectedGenders([]);
    setSelectedAmenities([]);
    setFurnishedOnly(false);
    setAvailableOnly(true);
    setSortMode("recommended");
    setVisibleCount(initialVisibleRooms);
  }

  const enriched = useMemo(() => enrichRooms(apiRooms || [], userCoords), [apiRooms, userCoords]);

  const searchIndex = useMemo(() => {
    try {
      return createRoomSearchIndex(enriched);
    } catch (_) {
      return null;
    }
  }, [enriched]);

  const filteredRooms = useMemo(() => {
    const q = keywordQuery.trim().toLowerCase();
    const cityFilter = String(cityQuery || "").trim().toLowerCase();
    // FlexSearch fast path: get matching ids for keyword query
    let flexIds = null;
    if (q && searchIndex) {
      try {
        const res = searchRoomIds(searchIndex, q, enriched.length);
        if (Array.isArray(res) && res.length >= 0) {
          // FlexSearch returns ids; if query normalized to empty it returns null
          flexIds = res ? new Set(res.map(String)) : null;
        }
      } catch (_) {}
    }
    let out = enriched.filter((room) => {
      if (q) {
        if (flexIds) {
          if (!flexIds.has(String(room.id))) return false;
        } else {
          const hay = `${room.title || ""} ${room.address || ""} ${room.location || ""} ${room.locationLabel || ""} ${room.city || ""} ${room.type || ""} ${room.roomType || ""} ${room.landmark || ""} ${(room.amenities || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
      }
      if (cityFilter && String(room.city || "").toLowerCase() !== cityFilter) return false;
      if (room.price != null && Number(room.price) > priceMax) return false;
      if (selectedTypes.length && !selectedTypes.includes(room.type || room.roomType)) return false;
      if (selectedGenders.length && !selectedGenders.includes(room.gender)) return false;
      if (furnishedOnly && !room.furnished) return false;
      if (availableOnly && room.availability === "occupied") return false;
      if (selectedAmenities.length && !selectedAmenities.every((a) => (room.amenities || []).includes(a))) return false;
      if (selectedDistance !== "all") {
        const opt = distanceFilterOptions.find((d) => d.value === selectedDistance);
        if (opt) {
          if (room.distanceKm == null) return false;
          if (opt.maxKm !== undefined && room.distanceKm > opt.maxKm) return false;
          if (opt.minKm !== undefined && room.distanceKm <= opt.minKm) return false;
        }
      }
      return true;
    });
    return sortRooms(out, sortMode);
  }, [enriched, keywordQuery, cityQuery, priceMax, selectedTypes, selectedGenders, selectedAmenities, furnishedOnly, availableOnly, selectedDistance, sortMode]);

  useEffect(() => {
    setVisibleCount(initialVisibleRooms);
  }, [keywordQuery, cityQuery, priceMax, selectedTypes, selectedGenders, selectedAmenities, furnishedOnly, availableOnly, selectedDistance, sortMode]);

  const visibleRooms = useMemo(() => filteredRooms.slice(0, visibleCount), [filteredRooms, visibleCount]);
  const hasMoreRooms = visibleRooms.length < filteredRooms.length;

  const activeFilterCount =
    selectedTypes.length +
    selectedGenders.length +
    selectedAmenities.length +
    Number(selectedDistance !== "all") +
    Number(furnishedOnly) +
    Number(!availableOnly) +
    Number(priceMax !== defaultPriceMax) +
    Number(Boolean(keywordQuery.trim())) +
    Number(Boolean(cityQuery.trim())) +
    Number(sortMode !== "recommended");

  function onSearch() {
    // keywordQuery already drives filtering; close keyboard focus naturally
    setShowFilters(true);
  }

  // Price slider thumb position 0-1
  const sliderRatio = (priceMax - priceMin) / (priceMaxLimit - priceMin);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <SiteHeader city={cityQuery || "Bhopal"} />

      <FlatList
        data={visibleRooms}
        keyExtractor={(item) => String(item.slug || item.id || item._id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Search card – mirrors website mx-auto max-w-[780px] rounded-[28px] */}
            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <Search size={16} color="#94a3b8" />
                  <TextInput
                    value={keywordQuery}
                    onChangeText={setKeywordQuery}
                    placeholder="Search PG, flat, WiFi, landmark"
                    placeholderTextColor="#94a3b8"
                    style={styles.searchInput}
                    returnKeyType="search"
                    onSubmitEditing={onSearch}
                  />
                  {keywordQuery ? (
                    <TouchableOpacity onPress={() => setKeywordQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.clearX}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <View style={styles.searchRowSecond}>
                <View style={styles.cityInputWrap}>
                  <MapPin size={14} color="#94a3b8" />
                  <TextInput
                    value={cityQuery}
                    onChangeText={setCityQuery}
                    placeholder="City (e.g. Bhopal)"
                    placeholderTextColor="#94a3b8"
                    style={styles.cityInput}
                    returnKeyType="search"
                    onSubmitEditing={onSearch}
                  />
                  {cityQuery ? (
                    <TouchableOpacity onPress={() => setCityQuery("")}>
                      <Text style={styles.clearX}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.budgetPill}>
                  <Text style={styles.budgetLabel}>Budget</Text>
                  <Text style={styles.budgetValue}>₹{priceMax.toLocaleString("en-IN")}</Text>
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={onSearch} activeOpacity={0.9}>
                  <Search size={14} color="#fff" />
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Distance & Location Control */}
            <View style={styles.distanceCard}>
              <View style={styles.distanceHeader}>
                <View style={styles.distanceLabelRow}>
                  <Compass size={14} color={COLORS.brand} />
                  <Text style={styles.distanceLabel}>Distance:</Text>
                </View>
                <View style={styles.gpsArea}>
                  {userCoords && isGps ? (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live GPS</Text>
                      <TouchableOpacity onPress={detectLocation} style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>{locationLoading ? "…" : "Refresh"}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : userCoords && !isGps ? (
                    <View style={styles.cityCenterBadge}>
                      <Text style={styles.cityCenterText}>{cityQuery || "Bhopal"} center</Text>
                      <TouchableOpacity onPress={detectLocation} style={styles.refreshBtn}>
                        <Text style={styles.refreshText}>{locationLoading ? "…" : "Refresh"}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {!isGps && (
                    <TouchableOpacity style={styles.useLocationBtn} onPress={detectLocation} disabled={locationLoading} activeOpacity={0.85}>
                      {locationLoading ? <Loader2 size={12} color={COLORS.brand} /> : <LocateFixed size={12} color={COLORS.brand} />}
                      <Text style={styles.useLocationText}>{locationLoading ? "Locating..." : "Use My Location"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.distancePills}>
                {distanceFilterOptions.map((opt) => {
                  const active = selectedDistance === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setSelectedDistance(opt.value);
                        if (opt.value !== "all" && !userCoords) detectLocation();
                      }}
                      style={[styles.distancePill, active && styles.distancePillActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.distancePillText, active && styles.distancePillTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {locationError ? <Text style={styles.locationError}>⚠️ {locationError}</Text> : null}
            </View>

            {/* Title + Filter/Reset row */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Find rooms</Text>
                <Text style={styles.subtitle}>
                  Showing <Text style={styles.subtitleStrong}>{filteredRooms.length} {filteredRooms.length === 1 ? "property" : "properties"}</Text>
                  {cityQuery ? ` in ${cityQuery}` : " across cities"}
                  {keywordQuery ? ` matching "${keywordQuery}"` : ""}
                  {selectedDistance !== "all" ? ` • ${distanceFilterOptions.find((d) => d.value === selectedDistance)?.label}` : ""}
                </Text>
              </View>
              <View style={styles.titleActions}>
                <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters((v) => !v)} activeOpacity={0.85}>
                  <SlidersHorizontal size={14} color={COLORS.ink} />
                  <Text style={styles.filterBtnText}>Filter</Text>
                  {activeFilterCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.85}>
                  <RotateCcw size={14} color="#fff" />
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters panel */}
            {showFilters && (
              <View style={styles.filtersPanel}>
                <View style={styles.filtersHeader}>
                  <View>
                    <Text style={styles.filtersTitle}>Filters</Text>
                    <Text style={styles.filtersSubtitle}>Budget, room type, tenant and amenities apply instantly</Text>
                  </View>
                  <TouchableOpacity onPress={resetFilters}>
                    <Text style={styles.resetLink}>Reset filters</Text>
                  </TouchableOpacity>
                </View>

                {/* Max price slider 2000-30000 */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Max price - Rs. {priceMax.toLocaleString("en-IN")}</Text>
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <View style={[styles.sliderFill, { width: `${sliderRatio * 100}%` }]} />
                      <View style={[styles.sliderThumb, { left: `${sliderRatio * 100}%` }]} />
                    </View>
                    <View style={styles.sliderBtns}>
                      <TouchableOpacity style={styles.sliderBtn} onPress={() => setPriceMax((p) => Math.max(priceMin, p - 500))}>
                        <Text style={styles.sliderBtnText}>− 500</Text>
                      </TouchableOpacity>
                      <Text style={styles.sliderRangeText}>₹2,000 — ₹30,000</Text>
                      <TouchableOpacity style={styles.sliderBtn} onPress={() => setPriceMax((p) => Math.min(priceMaxLimit, p + 500))}>
                        <Text style={styles.sliderBtnText}>+ 500</Text>
                      </TouchableOpacity>
                    </View>
                    {/* hidden native-like range for accessibility: use TextInput numeric */}
                    <View style={styles.priceInputRow}>
                      <Text style={styles.priceInputLabel}>Exact max:</Text>
                      <TextInput
                        value={String(priceMax)}
                        onChangeText={(t) => {
                          const n = Number(t.replace(/[^0-9]/g, ""));
                          if (!isNaN(n) && n >= priceMin && n <= priceMaxLimit) setPriceMax(n);
                        }}
                        keyboardType="numeric"
                        style={styles.priceInput}
                      />
                    </View>
                  </View>
                </View>

                {/* Room type */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Room type</Text>
                  <View style={styles.chipRow}>
                    {filterTypes.map((item) => {
                      const active = selectedTypes.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => toggleFilter(selectedTypes, item, setSelectedTypes)}
                          style={[styles.chip, active && styles.chipActive]}
                          activeOpacity={0.85}
                        >
                          {active && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Tenant */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Tenant</Text>
                  <View style={styles.chipRow}>
                    {filterGenders.map((item) => {
                      const active = selectedGenders.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => toggleFilter(selectedGenders, item, setSelectedGenders)}
                          style={[styles.chip, active && styles.chipActive]}
                          activeOpacity={0.85}
                        >
                          {active && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Amenities */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Amenities</Text>
                  <View style={styles.chipRow}>
                    {filterAmenities.map((item) => {
                      const active = selectedAmenities.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => toggleFilter(selectedAmenities, item, setSelectedAmenities)}
                          style={[styles.chip, active && styles.chipActive]}
                          activeOpacity={0.85}
                        >
                          {active && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Availability */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Availability</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      onPress={() => setFurnishedOnly((v) => !v)}
                      style={[styles.checkPill, furnishedOnly && styles.checkPillActive]}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.checkBox, furnishedOnly && styles.checkBoxActive]}>
                        {furnishedOnly && <Check size={10} color="#fff" />}
                      </View>
                      <Text style={[styles.checkPillText, furnishedOnly && styles.checkPillTextActive]}>Furnished</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAvailableOnly((v) => !v)}
                      style={[styles.checkPill, availableOnly && styles.checkPillActive]}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.checkBox, availableOnly && styles.checkBoxActive]}>
                        {availableOnly && <Check size={10} color="#fff" />}
                      </View>
                      <Text style={[styles.checkPillText, availableOnly && styles.checkPillTextActive]}>Available</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Distance from you (duplicate in panel) */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Distance from you</Text>
                  <View style={styles.chipRow}>
                    {distanceFilterOptions.map((opt) => {
                      const active = selectedDistance === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => {
                            setSelectedDistance(opt.value);
                            if (opt.value !== "all" && !isGps) detectLocation();
                          }}
                          style={[styles.chip, active && styles.chipActive]}
                          activeOpacity={0.85}
                        >
                          {active && <Check size={12} color="#fff" style={{ marginRight: 4 }} />}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Sort */}
                <View style={styles.filterBlock}>
                  <Text style={styles.filterLabel}>Sort</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
                    {sortOptions.map((opt) => {
                      const active = sortMode === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setSortMode(opt.value)}
                          style={[styles.sortPill, active && styles.sortPillActive]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.sortText, active && styles.sortTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const id = String(item.slug || item.id || item._id);
          const isSaved = savedIds.includes(id);
          return (
            <RoomCard
              room={item}
              saved={isSaved}
              onPress={() => navigation.navigate("RoomDetails", { slug: item.slug || item.id, room: item })}
              onToggleSave={() => dispatch(toggleSaved(id))}
              onChat={() => navigation.navigate("RoomDetails", { slug: item.slug || item.id, room: item })}
              onShare={() => {}}
            />
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No rooms match these filters</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.emptyLink}>Reset filters</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMoreRooms ? (
            <View style={styles.loadMoreWrap}>
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount((c) => c + visibleRoomStep)} activeOpacity={0.85}>
                <Text style={styles.loadMoreText}>Load more rooms</Text>
              </TouchableOpacity>
              <Text style={styles.loadMoreHint}>
                Showing {visibleRooms.length} of {filteredRooms.length}
              </Text>
            </View>
          ) : visibleRooms.length > 0 ? (
            <Text style={styles.endHint}>All {filteredRooms.length} properties shown</Text>
          ) : null
        }
      />
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={styles.loadingText}>Searching available rooms...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8, gap: 0 },
  // search card
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    marginTop: 6,
  },
  searchRow: { flexDirection: "row", alignItems: "center" },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: "800", paddingVertical: 0 },
  clearX: { color: "#94a3b8", fontSize: 14, fontWeight: "800", paddingHorizontal: 4 },
  searchRowSecond: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 8, marginTop: 2 },
  cityInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  cityInput: { flex: 1, color: COLORS.ink, fontSize: 12, fontWeight: "700", paddingVertical: 0 },
  budgetPill: {
    backgroundColor: COLORS.mutedSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  budgetLabel: { fontSize: 9, fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  budgetValue: { fontSize: 11, fontWeight: "900", color: COLORS.ink, marginTop: 1 },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 20,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  searchBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  // distance card
  distanceCard: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
  },
  distanceHeader: { flexDirection: "column", gap: 8 },
  distanceLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  distanceLabel: { fontSize: 11, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  gpsArea: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#10b981" },
  liveText: { fontSize: 12, fontWeight: "800", color: "#065f46" },
  cityCenterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cityCenterText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  refreshBtn: { marginLeft: 2 },
  refreshText: { fontSize: 11, fontWeight: "900", color: "#059669", textDecorationLine: "underline" },
  useLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brandSoft,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  useLocationText: { fontSize: 11, fontWeight: "900", color: COLORS.brand },
  distancePills: { gap: 6, marginTop: 10, paddingRight: 8 },
  distancePill: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  distancePillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand, shadowColor: COLORS.brand, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  distancePillText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  distancePillTextActive: { color: "#fff", fontWeight: "900" },
  locationError: { marginTop: 8, fontSize: 11, fontWeight: "600", color: "#e11d48" },
  // title row
  titleRow: { marginTop: 18, flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.ink, letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 16 },
  subtitleStrong: { fontWeight: "900", color: COLORS.ink },
  titleActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterBtnText: { fontSize: 12, fontWeight: "900", color: COLORS.ink },
  badge: { backgroundColor: COLORS.brandSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 18, alignItems: "center" },
  badgeText: { fontSize: 10, fontWeight: "900", color: COLORS.brand },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.ink, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  resetBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  // filters panel
  filtersPanel: { marginTop: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 16 },
  filtersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  filtersTitle: { fontSize: 14, fontWeight: "900", color: COLORS.ink },
  filtersSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "600", color: "#64748b" },
  resetLink: { fontSize: 12, fontWeight: "900", color: COLORS.brand },
  filterBlock: { marginBottom: 16 },
  filterLabel: { fontSize: 10, fontWeight: "900", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  chipTextActive: { color: "#fff", fontWeight: "900" },
  checkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  checkPillActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandSoft },
  checkBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  checkBoxActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  checkPillText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  checkPillTextActive: { color: COLORS.brand },
  sortRow: { gap: 6 },
  sortPill: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  sortPillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  sortText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  sortTextActive: { color: "#fff", fontWeight: "900" },
  sliderContainer: { gap: 10 },
  sliderTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden", position: "relative" },
  sliderFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: COLORS.brand, borderRadius: 3 },
  sliderThumb: {
    position: "absolute",
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: COLORS.brand,
    marginLeft: -9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderBtns: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sliderBtn: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sliderBtnText: { fontSize: 11, fontWeight: "800", color: COLORS.ink },
  sliderRangeText: { fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  priceInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceInputLabel: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: COLORS.ink,
    fontWeight: "800",
    fontSize: 12,
  },
  emptyBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 24,
    paddingVertical: 36,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: COLORS.ink },
  emptyLink: { marginTop: 8, fontSize: 12, fontWeight: "900", color: COLORS.brand },
  loadMoreWrap: { alignItems: "center", marginTop: 18, gap: 8 },
  loadMoreBtn: { backgroundColor: COLORS.ink, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 20 },
  loadMoreText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  loadMoreHint: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  endHint: { textAlign: "center", marginTop: 16, fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  loadingOverlay: { position: "absolute", top: 120, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 4 },
  loadingText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
});
