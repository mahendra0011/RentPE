import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { useSelector } from "react-redux";
import { ApiService, apiClient } from "../services/api";
import { COLORS, FONTS } from "../theme";
import { Building2, Camera, MapPin, Trash2, Eye, LocateFixed, Check } from "lucide-react-native";
import { cityCoordinates, cityOptions, listingCityOptions, getCityOption as libGetCityOption, roomTypeOptions as libRoomTypes, roomAmenityDefaults } from "../lib/listingMeta";
import { formatPrice } from "../lib/format";
import { formatCoordinate, isValidCoordinate } from "../lib/mapServices";
const amenityOptions = roomAmenityDefaults;
const roomTypeOptions = libRoomTypes;
const roomRuleSuggestions = ["No smoking", "ID proof required", "No loud music after 10 PM", "Visitors allowed with permission", "Rent due by 5th of every month"];

// Unified city source – removed truncated fallback (19 entries) and 38-entry subset; using 35 coords + 440 cities from lib/listingMeta
const cityCoordinatesFallback = cityCoordinates;

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
  chatEnabled: true,
  furnished: true,
  availability: "available",
};

// formatPrice unified via lib/format; formatCoordinate via lib/mapServices
function addRuleLine(value, rule) {
  const rules = String(value || "")
    .split(/\r?\n/)
    .map((i) => i.trim())
    .filter(Boolean);
  if (!rules.some((i) => i.toLowerCase() === rule.toLowerCase())) rules.push(rule);
  return rules.join("\n");
}
function getCityOption(city) {
  return libGetCityOption(city) || null;
}
function roomToForm(room) {
  return {
    title: room.title || "",
    type: room.type || "Single Room",
    gender: room.gender || "Co-ed",
    price: room.price ? String(room.price) : "",
    description: room.description || "",
    rules: (room.rules || []).join("\n"),
    amenities: room.amenities || [],
    address: room.address || "",
    city: room.city || "",
    state: room.state || "",
    landmark: room.landmark || "",
    longitude: room.geoCoordinates?.[0] ? String(room.geoCoordinates[0]) : room.longitude ? String(room.longitude) : "",
    latitude: room.geoCoordinates?.[1] ? String(room.geoCoordinates[1]) : room.latitude ? String(room.latitude) : "",
    ownerName: room.owner?.name || "",
    phone: String(room.owner?.phone || "").replace(/^91/, "").slice(-10),
    chatEnabled: room.chatEnabled !== false,
    furnished: room.furnished !== false,
    availability: room.availability || "available",
  };
}
function getMapFallback(city) {
  if (!city) return null;
  if (cityCoordinatesFallback[city]) return cityCoordinatesFallback[city];
  const matched = Object.keys(cityCoordinatesFallback).find((k) => k.toLowerCase() === city.toLowerCase());
  if (matched) return cityCoordinatesFallback[matched];
  return null;
}

function OwnerMetric({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{String(value)}</Text>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Field({ label, children, style }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export default function MyListingsScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user);
  const isOwner = user?.role === "owner";

  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  const selectedRoom = rooms.find((room) => String(room.id || room.slug || room._id) === String(selectedId));
  const photoPreviews = useMemo(() => photos.map((f) => f.uri), [photos]);
  const visibleImages = photoPreviews.length ? photoPreviews : selectedRoom?.images || (selectedRoom?.coverImage ? [selectedRoom.coverImage] : []);
  const availableCount = rooms.filter((r) => r.availability === "available").length;
  const occupiedCount = rooms.filter((r) => r.availability === "occupied").length;
  const averageRent = rooms.length ? Math.round(rooms.reduce((sum, r) => sum + Number(r.price || 0), 0) / rooms.length) : 0;

  const loadData = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await ApiService.getMyListings();
      const list = Array.isArray(data) ? data : data?.rooms || [];
      // normalize minimal: ensure id/slug, images, availability etc
      const normalized = list.map((r) => ({
        ...r,
        id: String(r.id || r.slug || r._id),
        slug: r.slug || r.id || r._id,
        coverImage: r.coverImage || r.images?.[0] || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
        images: r.images || (r.coverImage ? [r.coverImage] : []),
        location: r.location || `${r.city || ""}${r.city && r.address ? ", " : ""}${r.address || ""}`.trim() || r.city || "Bhopal, MP",
        availability: r.availability || "available",
        geoCoordinates: r.geoCoordinates || (r.location?.coordinates ? r.location.coordinates : null) || (r.longitude && r.latitude ? [Number(r.longitude), Number(r.latitude)] : null),
      }));
      setRooms(normalized);
      setSelectedId((current) => current || normalized[0]?.id || normalized[0]?.slug || "");
    } catch (err) {
      setError(err.message || "Failed to load listings.");
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    loadData();
    const unsub = navigation?.addListener?.("focus", () => loadData());
    return unsub;
  }, [loadData, navigation]);

  useEffect(() => {
    if (selectedRoom) {
      setForm(roomToForm(selectedRoom));
      setPhotos([]);
      setSavedMsg("");
      setLocationMessage("");
      setDeleteConfirmId("");
    }
  }, [selectedRoom?.id, selectedRoom?.slug]);

  function update(key, value) {
    setForm((cur) => ({ ...cur, [key]: value }));
    setSavedMsg("");
    setDeleteNotice("");
    if (["address", "city", "landmark", "longitude", "latitude"].includes(key)) setLocationMessage("");
    setDeleteConfirmId("");
  }
  function updateCity(value) {
    const opt = getCityOption(value);
    if (opt) setForm((cur) => ({ ...cur, city: opt.city, state: opt.state }));
    else setForm((cur) => ({ ...cur, city: value, state: cur.state }));
    setSavedMsg("");
    setDeleteNotice("");
    setLocationMessage("");
    setDeleteConfirmId("");
  }
  function toggleAmenity(amenity) {
    update(
      "amenities",
      form.amenities.includes(amenity) ? form.amenities.filter((a) => a !== amenity) : [...form.amenities, amenity]
    );
  }
  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to replace images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 8,
    });
    if (!result.canceled && result.assets) {
      const next = result.assets.slice(0, 8).map((a) => ({ uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: "image/jpeg" }));
      setPhotos(next);
      setSavedMsg("");
      setDeleteNotice("");
      setDeleteConfirmId("");
    }
  }

  async function findCoordinates() {
    setGeocoding(true);
    setError("");
    setLocationMessage("");
    try {
      const query = [form.address, form.landmark, form.city, form.state].filter(Boolean).join(", ");
      if (!query.trim()) throw new Error("Address is required before geocoding.");
      const fallback = getMapFallback(form.city);
      if (fallback) {
        const [lng, lat] = fallback;
        update("longitude", String(lng));
        update("latitude", String(lat));
        // need to update after setState async: set directly
        setForm((cur) => ({ ...cur, longitude: String(lng), latitude: String(lat) }));
        setLocationMessage(`Coordinates for ${form.city || query} added (city approximation).`);
      } else {
        setForm((cur) => ({ ...cur, longitude: "77.4126", latitude: "23.2599" }));
        setLocationMessage("No city match — using default center. Edit manually if needed.");
      }
    } catch (e) {
      setLocationMessage(e.message);
    } finally {
      setGeocoding(false);
    }
  }

  function useCurrentLocation() {
    setLocationMessage("");
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((cur) => ({ ...cur, longitude: String(pos.coords.longitude), latitude: String(pos.coords.latitude) }));
          setLocationMessage("Current location added.");
        },
        () => setLocationMessage("Location permission was not allowed."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // fallback to Bhopal center
      setForm((cur) => ({ ...cur, longitude: "77.4126", latitude: "23.2599" }));
      setLocationMessage("Current location not available — using default. Edit manually.");
    }
  }

  async function saveListing() {
    if (!selectedRoom) return;
    // validation mirroring website ListRoom publish + MyListedRooms expectations
    if (!form.title.trim() || !form.price || !form.address.trim() || !form.ownerName.trim()) {
      setError("Please complete title, rent price, address, and owner name.");
      return;
    }
    if (!form.city) {
      setError("Please select a city.");
      return;
    }
    if (!form.phone || form.phone.replace(/\D/g, "").length < 10) {
      setError("Please enter valid 10-digit phone number.");
      return;
    }
    if (!form.longitude || !form.latitude) {
      // auto fallback like website would still allow but we warn
      // not blocking
    }
    setSaving(true);
    setError("");
    setSavedMsg("");
    setDeleteNotice("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        payload.append(key, String(value ?? ""));
      });
      photos.forEach((file) => {
        payload.append("photos", {
          uri: file.uri,
          name: file.name || `photo_${Date.now()}.jpg`,
          type: file.type || "image/jpeg",
        });
      });
      const slug = selectedRoom.slug || selectedRoom.id;
      // use apiClient PATCH directly for reliability (ApiService.updateRoom wraps)
      let updated;
      try {
        const res = await ApiService.updateRoom(slug, payload);
        updated = res.room || res;
      } catch (e) {
        // fallback direct apiClient
        const res2 = await apiClient.patch(`/api/rooms/${encodeURIComponent(slug)}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updated = res2.data?.room || res2.data;
      }
      // normalize updated to room shape
      const nextRoom = {
        ...updated,
        id: String(updated.id || updated.slug || updated._id || slug),
        slug: updated.slug || updated.id || slug,
        coverImage: updated.coverImage || updated.images?.[0] || selectedRoom.coverImage,
        images: updated.images || selectedRoom.images,
        location: updated.location || `${updated.city || form.city}, ${updated.address || form.address}`.trim(),
        availability: updated.availability || form.availability,
        geoCoordinates: updated.geoCoordinates || (updated.location?.coordinates) || [Number(form.longitude), Number(form.latitude)],
      };
      setRooms((cur) => cur.map((r) => (String(r.id) === String(selectedRoom.id) || String(r.slug) === String(selectedRoom.slug) ? { ...r, ...nextRoom } : r)));
      setSelectedId(nextRoom.id || nextRoom.slug);
      setPhotos([]);
      setSavedMsg("Listing updated successfully.");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to update listing.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteListing() {
    if (!selectedRoom) return;
    const listingId = String(selectedRoom.slug || selectedRoom.id);
    if (deleteConfirmId !== listingId) {
      setDeleteConfirmId(listingId);
      setError("");
      setSavedMsg("");
      setDeleteNotice("");
      return;
    }
    setDeletingId(listingId);
    setError("");
    setSavedMsg("");
    setDeleteNotice("");
    try {
      try {
        await ApiService.deleteRoom(listingId);
      } catch {
        await apiClient.delete(`/api/rooms/${encodeURIComponent(listingId)}`);
      }
      const idx = rooms.findIndex((r) => String(r.id) === String(selectedRoom.id) || String(r.slug) === String(selectedRoom.slug));
      const nextRooms = rooms.filter((r) => String(r.id) !== String(selectedRoom.id) && String(r.slug) !== String(selectedRoom.slug));
      const nextSelected = nextRooms[Math.min(idx, nextRooms.length - 1)];
      setRooms(nextRooms);
      setSelectedId(nextSelected ? String(nextSelected.id || nextSelected.slug) : "");
      setPhotos([]);
      setDeleteConfirmId("");
      setDeleteNotice("Listing deleted successfully.");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to delete listing.");
    } finally {
      setDeletingId("");
    }
  }

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.guardSafe}>
        <StatusBar style="dark" />
        <View style={styles.guardWrap}>
          <View style={styles.guardCard}>
            <View style={styles.guardIcon}>
              <Building2 size={28} color={COLORS.brand} />
            </View>
            <Text style={styles.guardTitle}>Owner login required.</Text>
            <Text style={styles.guardSub}>Login as a room owner to manage your posted rooms.</Text>
            <View style={styles.guardRow}>
              <TouchableOpacity style={styles.guardPrimary} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.guardPrimaryText}>Owner Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.guardSecondary} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.guardSecondaryText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Owner panel</Text>
          </View>
          <Text style={styles.headerTitle}>My Listed Rooms</Text>
          <Text style={styles.headerSub}>Update rent, address, rules, amenities, availability, contact number, and photos.</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("ListRoom")}>
          <Text style={styles.addBtnText}>+ Add room</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {deleteNotice ? (
        <View style={[styles.errorBox, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
          <Text style={[styles.errorText, { color: "#065f46" }]}>{deleteNotice}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.brand} size="large" />
          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 32 }}>✕</Text>
            <Text style={styles.emptyTitle}>No rooms listed yet</Text>
            <Text style={styles.emptySub}>List your first room, then it will appear here for editing photos, price, availability, and contact details.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => navigation.navigate("ListRoom")}>
              <Text style={styles.emptyActionText}>List your room</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Metrics 4 */}
          <View style={styles.metricsRow}>
            <OwnerMetric label="Live listings" value={rooms.length} />
            <OwnerMetric label="Available" value={availableCount} />
            <OwnerMetric label="Occupied" value={occupiedCount} />
            <OwnerMetric label="Avg rent" value={formatPrice(averageRent)} />
          </View>

          {/* Selectable aside list */}
          <Text style={styles.asideTitle}>Your listings — tap to edit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {rooms.map((room) => {
              const active = String(room.id) === String(selectedId) || String(room.slug) === String(selectedId);
              return (
                <TouchableOpacity
                  key={String(room.id || room.slug)}
                  onPress={() => setSelectedId(String(room.id || room.slug))}
                  style={[styles.asideCard, active && styles.asideCardActive]}
                >
                  <Image source={{ uri: room.coverImage }} style={styles.asideImage} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.asideRoomTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.asideLoc} numberOfLines={1}>
                      {room.location}
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                      <Text style={styles.asidePrice}>{formatPrice(room.price)}</Text>
                      <View style={[styles.availPill, room.availability === "available" ? { backgroundColor: COLORS.brandSoft } : { backgroundColor: "#f1f5f9" }]}>
                        <Text style={[styles.availText, room.availability === "available" && { color: COLORS.brand }]}>{room.availability}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Edit form */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>Edit listing</Text>
                <Text style={styles.formSub}>New photo upload replaces old listing photos.</Text>
              </View>
              {selectedRoom && (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate("RoomDetails", { slug: selectedRoom.slug || selectedRoom.id, room: selectedRoom })}>
                    <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><Eye size={12} color={COLORS.ink} /><Text style={styles.viewBtnText}>View</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteBtn, deleteConfirmId === String(selectedRoom.slug || selectedRoom.id) && styles.deleteBtnConfirm]}
                    onPress={deleteListing}
                    disabled={Boolean(deletingId)}
                  >
                    {deletingId === String(selectedRoom.slug || selectedRoom.id) ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <View style={{flexDirection:"row", alignItems:"center", gap:4}}><Trash2 size={12} color={deleteConfirmId === String(selectedRoom.slug || selectedRoom.id) ? "#fff" : "#e11d48"} /><Text style={[styles.deleteBtnText, deleteConfirmId === String(selectedRoom.slug || selectedRoom.id) && { color: "#fff" }]}>{deleteConfirmId === String(selectedRoom.slug || selectedRoom.id) ? "Confirm delete" : "Delete"}</Text></View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Photos */}
            <View style={styles.photoGrid}>
              {visibleImages.slice(0, 8).map((img, idx) => (
                <Image key={`${img}-${idx}`} source={{ uri: img }} style={styles.photoThumb} />
              ))}
              <TouchableOpacity style={styles.replaceBox} onPress={pickPhotos}>
                <Camera size={18} color={COLORS.brand} />
                <Text style={styles.replaceText}>Replace photos</Text>
                <Text style={styles.replaceSub}>{photos.length ? `${photos.length} new` : "Tap to pick up to 8"}</Text>
              </TouchableOpacity>
            </View>

            {/* Fields */}
            <Field label="Listing title">
              <TextInput value={form.title} onChangeText={(v) => update("title", v)} style={styles.input} placeholder="Sunny single PG room" placeholderTextColor="#94a3b8" />
            </Field>
            <Field label="Monthly rent">
              <TextInput value={String(form.price)} onChangeText={(v) => update("price", v)} style={styles.input} placeholder="6500" keyboardType="numeric" placeholderTextColor="#94a3b8" />
            </Field>

            <View style={styles.row2}>
              <Field label="Property type" style={{ flex: 1 }}>
                <View style={styles.pickerWrap}>
                  <ScrollView style={{ maxHeight: 110 }} nestedScrollEnabled>
                    {roomTypeOptions.map((t) => (
                      <TouchableOpacity key={t} style={[styles.pickerOption, form.type === t && styles.pickerOptionActive]} onPress={() => update("type", t)}>
                        <Text style={[styles.pickerText, form.type === t && styles.pickerTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </Field>
              <Field label="Tenant" style={{ flex: 1 }}>
                <View style={styles.chipRow}>
                  {["Co-ed", "Girls", "Boys"].map((g) => (
                    <TouchableOpacity key={g} style={[styles.chip, form.gender === g && styles.chipActive]} onPress={() => update("gender", g)}>
                      <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            </View>

            <Field label="City">
              <View style={styles.pickerWrap}>
                <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                  <TouchableOpacity style={[styles.pickerOption, !form.city && styles.pickerOptionActive]} onPress={() => updateCity("")}>
                    <Text style={[styles.pickerText, !form.city && styles.pickerTextActive]}>Select city and state</Text>
                  </TouchableOpacity>
                  {listingCityOptions.map((opt) => (
                    <TouchableOpacity key={opt.label} style={[styles.pickerOption, form.city === opt.city && styles.pickerOptionActive]} onPress={() => updateCity(opt.city)}>
                      <Text style={[styles.pickerText, form.city === opt.city && styles.pickerTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {form.state ? <Text style={styles.stateHint}>State: {form.state}</Text> : null}
            </Field>

            <Field label="Landmark">
              <TextInput value={form.landmark} onChangeText={(v) => update("landmark", v)} style={styles.input} placeholder="City College, DB Mall" placeholderTextColor="#94a3b8" />
            </Field>
            <Field label="Full address">
              <TextInput value={form.address} onChangeText={(v) => update("address", v)} style={styles.input} placeholder="House no, street, area" placeholderTextColor="#94a3b8" />
            </Field>
            <Field label="Owner phone">
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  value={form.phone}
                  onChangeText={(v) => update("phone", v.replace(/\D/g, "").slice(0, 10))}
                  style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginBottom: 0 }]}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </Field>

            <Field label="Coordinates">
              <View style={styles.geoRow}>
                <TouchableOpacity style={[styles.geoPrimary, geocoding && { opacity: 0.7 }]} onPress={findCoordinates} disabled={geocoding}>
                  {geocoding ? <ActivityIndicator color="#fff" size="small" /> : <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><MapPin size={14} color="#fff" /><Text style={styles.geoPrimaryText}>Find</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.geoSecondary} onPress={useCurrentLocation}>
                  <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><LocateFixed size={14} color={COLORS.ink} /><Text style={styles.geoSecondaryText}>Current</Text></View>
                </TouchableOpacity>
              </View>
              {(form.longitude && form.latitude) || locationMessage ? (
                <View style={styles.locationInfo}>
                  {form.longitude && form.latitude ? (
                    <Text style={styles.locationCoords}>
                      {formatCoordinate(form.latitude)}, {formatCoordinate(form.longitude)}
                    </Text>
                  ) : null}
                  {locationMessage ? <Text style={styles.locationMsg}>{locationMessage}</Text> : null}
                </View>
              ) : null}
            </Field>

            <Field label="Owner name">
              <TextInput value={form.ownerName} onChangeText={(v) => update("ownerName", v)} style={styles.input} placeholder="Owner full name" placeholderTextColor="#94a3b8" />
            </Field>
            <Field label="Availability">
              <View style={styles.chipRow}>
                {["available", "occupied"].map((a) => (
                  <TouchableOpacity key={a} style={[styles.chip, form.availability === a && styles.chipActive]} onPress={() => update("availability", a)}>
                    <Text style={[styles.chipText, form.availability === a && styles.chipTextActive]}>{a.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Description">
              <TextInput value={form.description} onChangeText={(v) => update("description", v)} style={[styles.input, { height: 90, textAlignVertical: "top" }]} multiline placeholder="Mention college, area, food, safety..." placeholderTextColor="#94a3b8" />
            </Field>

            <Field label="House rules (one per line)">
              <TextInput value={form.rules} onChangeText={(v) => update("rules", v)} style={[styles.input, { height: 80, textAlignVertical: "top" }]} multiline placeholder="No smoking&#10;ID proof required" placeholderTextColor="#94a3b8" />
              <View style={styles.ruleChips}>
                {roomRuleSuggestions.map((rule) => (
                  <TouchableOpacity key={rule} style={styles.ruleChip} onPress={() => update("rules", addRuleLine(form.rules, rule))}>
                    <Text style={styles.ruleChipText}>{rule}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            <Field label="Amenities">
              <View style={styles.chipGrid}>
                {amenityOptions.map((amenity) => {
                  const active = form.amenities.includes(amenity);
                  return (
                    <TouchableOpacity key={amenity} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleAmenity(amenity)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {active ? "✓ " : ""}
                        {amenity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>

            <Field label="Controls">
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Furnished</Text>
                <Switch value={form.furnished} onValueChange={(v) => update("furnished", v)} trackColor={{ true: COLORS.brand }} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>In-App Chat</Text>
                <Switch value={form.chatEnabled} onValueChange={(v) => update("chatEnabled", v)} trackColor={{ true: COLORS.brand }} />
              </View>
            </Field>

            <View style={styles.saveRow}>
              {savedMsg ? (
                <View style={styles.savedPill}>
                  <Text style={styles.savedText}>✓ {savedMsg}</Text>
                </View>
              ) : (
                <View />
              )}
              <TouchableOpacity style={[styles.saveBtn, (saving || Boolean(deletingId)) && { opacity: 0.6 }]} onPress={saveListing} disabled={saving || Boolean(deletingId)}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><Check size={14} color="#fff" /><Text style={styles.saveBtnText}>Save changes</Text></View>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  guardSafe: { flex: 1, backgroundColor: COLORS.background },
  guardWrap: { flex: 1, justifyContent: "center", padding: 20 },
  guardCard: { backgroundColor: COLORS.card, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border, padding: 24, alignItems: "center" },
  guardIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  guardTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "900", textAlign: "center" },
  guardSub: { color: COLORS.muted, fontSize: 13, fontWeight: "500", textAlign: "center", marginTop: 8, lineHeight: 18 },
  guardRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  guardPrimary: { backgroundColor: COLORS.brand, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 },
  guardPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  guardSecondary: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, backgroundColor: "#fff" },
  guardSecondaryText: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  badge: { alignSelf: "flex-start", backgroundColor: COLORS.brandSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { color: COLORS.brand, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  headerTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900", marginTop: 6 },
  headerSub: { color: COLORS.muted, fontSize: 11, marginTop: 4, lineHeight: 16, maxWidth: 220 },
  addBtn: { backgroundColor: COLORS.ink, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, alignSelf: "flex-start" },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  errorBox: { marginHorizontal: 16, marginTop: 8, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", padding: 10, borderRadius: 12 },
  errorText: { color: "#b91c1c", fontSize: 12, fontWeight: "700" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  loadingText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  emptyWrap: { flex: 1, padding: 16 },
  emptyCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 20, padding: 24, alignItems: "center", gap: 8 },
  emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900", marginTop: 8 },
  emptySub: { color: COLORS.muted, fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 4 },
  emptyAction: { marginTop: 12, backgroundColor: COLORS.brand, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20 },
  emptyActionText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "47%", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, alignItems: "center" },
  metricValue: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", marginTop: 4, letterSpacing: 0.5 },
  asideTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900", marginBottom: 4 },
  asideCard: { width: 220, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 10, flexDirection: "row", gap: 10 },
  asideCardActive: { borderColor: COLORS.brand, borderWidth: 1.5, backgroundColor: "#fff" },
  asideImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: COLORS.mutedSoft },
  asideRoomTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  asideLoc: { color: COLORS.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  asidePrice: { color: COLORS.brand, fontSize: 12, fontWeight: "900" },
  availPill: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
  availText: { fontSize: 9, fontWeight: "900", color: COLORS.muted, textTransform: "uppercase" },
  formCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16 },
  formHeader: { marginBottom: 12, gap: 4 },
  formTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900" },
  formSub: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  viewBtn: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#fff" },
  viewBtnText: { color: COLORS.ink, fontSize: 11, fontWeight: "900" },
  deleteBtn: { borderWidth: 1, borderColor: "#fecaca", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#fff" },
  deleteBtnConfirm: { backgroundColor: "#e11d48", borderColor: "#e11d48" },
  deleteBtnText: { color: "#e11d48", fontSize: 11, fontWeight: "900" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  photoThumb: { width: 70, height: 70, borderRadius: 10, backgroundColor: COLORS.mutedSoft },
  replaceBox: { width: 70, height: 70, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background, padding: 4 },
  replaceText: { fontSize: 8, fontWeight: "900", color: COLORS.muted, marginTop: 2, textAlign: "center" },
  replaceSub: { fontSize: 7, fontWeight: "700", color: COLORS.brand, marginTop: 1, textAlign: "center" },
  fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.ink, fontSize: 13 },
  row2: { flexDirection: "row", gap: 10 },
  pickerWrap: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: "#fff", overflow: "hidden" },
  pickerOption: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  pickerOptionActive: { backgroundColor: COLORS.brandSoft },
  pickerText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  pickerTextActive: { color: COLORS.brand, fontWeight: "900" },
  stateHint: { color: COLORS.brand, fontSize: 11, fontWeight: "700", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#f8fafc" },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 11, fontWeight: "800", color: COLORS.muted },
  chipTextActive: { color: "#fff" },
  phoneRow: { flexDirection: "row", alignItems: "center" },
  phonePrefix: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRightWidth: 0, paddingHorizontal: 12, paddingVertical: 11, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  phonePrefixText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  geoRow: { flexDirection: "row", gap: 8 },
  geoPrimary: { flex: 1, backgroundColor: COLORS.ink, paddingVertical: 12, borderRadius: 20, alignItems: "center" },
  geoPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  geoSecondary: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 20, alignItems: "center" },
  geoSecondaryText: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  locationInfo: { marginTop: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10 },
  locationCoords: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  locationMsg: { color: COLORS.muted, fontSize: 11, fontWeight: "600", marginTop: 4 },
  ruleChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  ruleChip: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "#fff" },
  ruleChipText: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  toggleLabel: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  saveRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 },
  savedPill: { backgroundColor: "#ecfdf5", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#a7f3d0", flexShrink: 1 },
  savedText: { color: "#065f46", fontSize: 11, fontWeight: "900" },
  saveBtn: { backgroundColor: COLORS.brand, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
