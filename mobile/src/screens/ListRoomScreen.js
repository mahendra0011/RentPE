import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useSelector } from "react-redux";
import { ApiService } from "../services/api";
import { COLORS, FONTS } from "../theme";
import { Camera, MapPin, LocateFixed, ShieldCheck, Upload, FolderOpen } from "lucide-react-native";
import { cityCoordinates, cityOptions, listingCityOptions, roomTypeOptions as libRoomTypes, roomAmenityDefaults, getCityOption as libGetCityOption } from "../lib/listingMeta";
import { getMapTilerStyleUrl, geocodeAddress } from "../lib/mapServices";

// Unified from src/lib/listingMeta single source
const roomTypeOptions = libRoomTypes;
const amenities = roomAmenityDefaults;
const roomRuleSuggestions = [
  "No smoking",
  "ID proof required",
  "No loud music after 10 PM",
  "Visitors allowed with permission",
  "Rent due by 5th of every month",
];
// Unified city source – removed truncated 10-entry fallback and 38-entry subset; now using 35 coords + 440 cities from lib/listingMeta
const cityCoordinatesFallback = cityCoordinates;
// listingCityOptions now is the full 440-entry list from single source (aliased as cityOptions)

const steps = [
  { id: 1, label: "Details" },
  { id: 2, label: "Rules" },
  { id: 3, label: "Photos" },
  { id: 4, label: "Location" },
  { id: 5, label: "Contact" },
];

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

export default function ListRoomScreen({ route, navigation }) {
  const user = useSelector((state) => state.auth.user);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  const [data, setData] = useState({
    title: "",
    type: "Single Room",
    gender: "Co-ed",
    price: "",
    description: "",
    rules: "",
    amenities: [],
    photos: [], // array of { uri }
    address: "",
    city: "",
    state: "",
    landmark: "",
    longitude: "",
    latitude: "",
    ownerName: user?.name || "",
    phone: user?.phone || "",
    chatEnabled: true,
    customAmenity: "",
  });

  // keep owner fields in sync with user if available
  useEffect(() => {
    if (user) {
      setData((c) => ({
        ...c,
        ownerName: c.ownerName || user.name || "",
        phone: c.phone || user.phone || "",
      }));
    }
  }, [user]);

  // handle 360 shots returned from GuidedCapture (preserve optional)
  const [panoShots, setPanoShots] = useState([]);
  useEffect(() => {
    if (route.params?.captured360Photos) setPanoShots(route.params.captured360Photos);
  }, [route.params?.captured360Photos]);

  function update(key, value) {
    setData((cur) => ({ ...cur, [key]: value }));
    if (["address", "city", "landmark", "longitude", "latitude"].includes(key)) setLocationMessage("");
    if (error) setError("");
  }

  function updateCity(value) {
    const opt = getCityOption(value);
    if (opt) {
      setData((cur) => ({ ...cur, city: opt.city, state: opt.state }));
    } else {
      // custom city - keep state as typed? fallback to empty
      setData((cur) => ({ ...cur, city: value, state: cur.state }));
    }
    setLocationMessage("");
  }

  function toggleAmenity(amenity) {
    setData((cur) => ({
      ...cur,
      amenities: cur.amenities.includes(amenity)
        ? cur.amenities.filter((a) => a !== amenity)
        : [...cur.amenities, amenity],
    }));
  }

  function addCustomAmenity() {
    const value = data.customAmenity.trim();
    if (!value) return;
    if (data.amenities.includes(value)) {
      update("customAmenity", "");
      return;
    }
    setData((cur) => ({ ...cur, amenities: [...cur.amenities, value], customAmenity: "" }));
  }

  function removeAmenity(amenity) {
    setData((cur) => ({ ...cur, amenities: cur.amenities.filter((a) => a !== amenity) }));
  }

  async function pickRegularPhotos() {
    if (data.photos.length >= 8) {
      Alert.alert("Limit reached", "Up to 8 photos only.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please grant access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 8 - data.photos.length,
    });
    if (!result.canceled && result.assets) {
      const remaining = 8 - data.photos.length;
      const next = result.assets.slice(0, remaining).map((a) => ({ uri: a.uri }));
      setData((cur) => ({ ...cur, photos: [...cur.photos, ...next] }));
    }
  }

  function removePhoto(index) {
    setData((cur) => ({ ...cur, photos: cur.photos.filter((_, i) => i !== index) }));
  }

  async function findCoordinates() {
    setGeocoding(true);
    setError("");
    setLocationMessage("");
    try {
      const query = [data.address, data.landmark, data.city, data.state].filter(Boolean).join(", ");
      if (!query.trim()) throw new Error("Address is required before geocoding.");
      // Prefer MapTiler geocodeAddress from lib/mapServices (EXPO_PUBLIC_ env) if configured, fallback to city center
      try {
        const result = await geocodeAddress(query);
        if (result?.longitude && result?.latitude) {
          update("longitude", String(result.longitude));
          update("latitude", String(result.latitude));
          setLocationMessage(`Coordinates for ${result.label} added via MapTiler.`);
          return;
        }
      } catch (_) {
        // fall back to city center approximation
      }
      let coords = null;
      if (data.city && cityCoordinatesFallback[data.city]) {
        coords = cityCoordinatesFallback[data.city];
      } else if (data.city) {
        const matched = Object.keys(cityCoordinatesFallback).find((k) => k.toLowerCase() === data.city.toLowerCase());
        if (matched) coords = cityCoordinatesFallback[matched];
      }
      if (coords) {
        const [lng, lat] = coords;
        update("longitude", String(lng));
        update("latitude", String(lat));
        setLocationMessage(`Coordinates for ${data.city || query} added (city approximation).`);
      } else {
        update("longitude", "77.4126");
        update("latitude", "23.2599");
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
    // Mobile may have expo-location, but keep lightweight placeholder like website geolocation
    // Try navigator.geolocation if available (web), else mock with fallback
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          update("longitude", String(pos.coords.longitude));
          update("latitude", String(pos.coords.latitude));
          setLocationMessage("Current location added.");
        },
        () => setLocationMessage("Location permission was not allowed."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // Expo Go on native: approximate - use default city or prompt
      // For now set Bhopal center as placeholder and inform
      update("longitude", "77.4126");
      update("latitude", "23.2599");
      setLocationMessage("Current location not available on this device — using default. Edit manually.");
    }
  }

  async function publishListing() {
    if (!data.title.trim() || !data.price || !data.address.trim() || !data.ownerName.trim()) {
      setError("Please complete title, rent price, address, and owner name.");
      return;
    }
    if (!data.city) {
      setError("Please select a city.");
      return;
    }
    if (!data.phone || data.phone.length < 10) {
      setError("Please enter valid 10-digit phone number.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const payload = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === "photos") return;
        if (key === "customAmenity") return;
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        payload.append(key, String(value ?? ""));
      });
      data.photos.forEach((file, idx) => {
        payload.append("photos", {
          uri: file.uri,
          name: `room_photo_${idx}.jpg`,
          type: "image/jpeg",
        });
      });

      const created = await ApiService.createRoom(payload);
      const createdSlug = created?.room?.slug || created?.slug || created?.id;

      if (panoShots.length > 0 && createdSlug) {
        try {
          const metadata = panoShots.map((p, idx) => ({ pitch: p.pitch, yaw: p.yaw, order: idx }));
          await ApiService.uploadPanoramaBatch({ listingId: createdSlug, photos: panoShots, metadata });
        } catch {
          // ignore panorama errors - listing already created
        }
      }

      Alert.alert(
        "Listing Published!",
        panoShots.length > 0 ? "Your room is live! 360° stitching in background." : "Your room has been published.",
        [{ text: "View My Listings", onPress: () => navigation.navigate("MyListings") }]
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to publish listing.");
    } finally {
      setSubmitting(false);
    }
  }

  // Owner guard like website /src/pages/ListRoom.jsx:186
  if (!user || user.role !== "owner") {
    return (
      <SafeAreaView style={styles.guardSafe}>
        <StatusBar style="dark" />
        <View style={styles.guardWrap}>
          <View style={styles.guardCard}>
            <View style={styles.guardIcon}>
              <ShieldCheck size={28} color={COLORS.brand} />
            </View>
            <Text style={styles.guardTitle}>Owner login required.</Text>
            <Text style={styles.guardSub}>
              Tick the room owner checkbox during OTP login, then List Your Room will open from the navbar.
            </Text>
            <View style={styles.guardBtnRow}>
              <TouchableOpacity style={styles.guardPrimary} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.guardPrimaryText}>Owner Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.guardSecondary} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.guardSecondaryText}>Owner Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>List a Room</Text>
        <Text style={styles.stepIndicator}>Step {step} of {steps.length}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step - 1) / (steps.length - 1)) * 100}%` }]} />
      </View>

      {/* Stepper like website */}
      <View style={styles.stepperRow}>
        {steps.map((item) => {
          const active = step === item.id;
          const complete = step > item.id;
          return (
            <View key={item.id} style={styles.stepperItem}>
              <View
                style={[
                  styles.stepCircle,
                  complete && styles.stepCircleComplete,
                  active && styles.stepCircleActive,
                ]}
              >
                <Text style={[styles.stepCircleText, (complete || active) && styles.stepCircleTextActive]}>
                  {complete ? "✓" : String(item.id)}
                </Text>
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive, complete && styles.stepLabelComplete]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.stepContainer}>
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Tell us about your room</Text>
              <Text style={styles.stepSubtitle}>No brokerage. Direct verified leads & instant in-app chat.</Text>

              <Text style={styles.label}>Listing title</Text>
              <TextInput
                style={styles.input}
                placeholder="Sunny single PG room near City College"
                placeholderTextColor={COLORS.muted}
                value={data.title}
                onChangeText={(v) => update("title", v)}
              />

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Property type</Text>
                  <View style={styles.chipGrid}>
                    {roomTypeOptions.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, data.type === t && styles.chipActive]}
                        onPress={() => update("type", t)}
                      >
                        <Text style={[styles.chipText, data.type === t && styles.chipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tenant gender</Text>
                  <View style={styles.chipGrid}>
                    {["Co-ed", "Girls", "Boys"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.chip, data.gender === g && styles.chipActive]}
                        onPress={() => update("gender", g)}
                      >
                        <Text style={[styles.chipText, data.gender === g && styles.chipTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Monthly rent (Rs.)</Text>
              <TextInput
                style={styles.input}
                placeholder="6500"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
                value={data.price}
                onChangeText={(v) => update("price", v)}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                placeholder="Mention college, office, area, food options, and safety."
                placeholderTextColor={COLORS.muted}
                multiline
                value={data.description}
                onChangeText={(v) => update("description", v)}
              />

              <Text style={styles.label}>Amenities</Text>
              <View style={styles.chipGrid}>
                {amenities.map((a) => {
                  const active = data.amenities.includes(a);
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleAmenity(a)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {active ? "✓ " : ""}{a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {data.amenities.length > 0 && (
                <View style={[styles.chipGrid, { marginTop: 8 }]}>
                  {data.amenities.map((a) => (
                    <View key={a} style={styles.selectedPill}>
                      <Text style={styles.selectedPillText}>{a}</Text>
                      <TouchableOpacity onPress={() => removeAmenity(a)} style={styles.pillX}>
                        <Text style={{ color: COLORS.brand, fontSize: 10, fontWeight: "900" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Add amenity"
                  placeholderTextColor={COLORS.muted}
                  value={data.customAmenity}
                  onChangeText={(v) => update("customAmenity", v)}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addCustomAmenity}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Set house rules</Text>
              <Text style={styles.stepSubtitle}>These rules will be visible on the room details page.</Text>

              <Text style={styles.label}>House rules</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="One rule per line, e.g. no smoking, ID proof required"
                placeholderTextColor={COLORS.muted}
                multiline
                value={data.rules}
                onChangeText={(v) => update("rules", v)}
              />
              <View style={styles.chipGrid}>
                {roomRuleSuggestions.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.ruleChip}
                    onPress={() => update("rules", addRuleLine(data.rules, r))}
                  >
                    <Text style={styles.ruleChipText}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Add clear rules like visitor timing, rent date, smoking, pets, gate timing, and ID proof
                  requirement.
                </Text>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Add photos</Text>
              <Text style={styles.stepSubtitle}>Up to 8 photos. The first is your cover.</Text>

              <TouchableOpacity style={styles.uploadDashed} onPress={pickRegularPhotos}>
                <Upload size={24} color={COLORS.brand} />
                <Text style={styles.uploadTitle}>Click to upload photos</Text>
                <Text style={styles.uploadSub}>JPG or PNG up to 10MB each</Text>
                <Text style={styles.uploadCount}>{data.photos.length}/8 selected</Text>
              </TouchableOpacity>

              {data.photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {data.photos.map((p, idx) => (
                    <View key={idx} style={styles.photoWrap}>
                      <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                      {idx === 0 && (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverText}>COVER</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.delPhotoBtn} onPress={() => removePhoto(idx)}>
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Optional 360 section preserved */}
              <View style={styles.panoCard}>
                <Text style={styles.panoTitle}>Full-Sphere 360° Capture (optional)</Text>
                <Text style={styles.panoSub}>Ceiling, eye-level & floor guided capture using gyroscope.</Text>
                {panoShots.length > 0 ? (
                  <View style={styles.panoSuccess}>
                    <Text style={styles.panoSuccessText}>✓ {panoShots.length} spherical photos ready</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={styles.smallPrimary}
                        onPress={() => navigation.navigate("GuidedCapture", { listingId: "new_listing", listingTitle: data.title || "New Room" })}
                      >
                        <Text style={styles.smallPrimaryText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setPanoShots([])}>
                        <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "700" }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={styles.guidedBtn}
                      onPress={() => navigation.navigate("GuidedCapture", { listingId: "new_listing", listingTitle: data.title || "New Room" })}
                    >
                      <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><Camera size={14} color="#fff" /><Text style={styles.guidedText}>Launch Guided 360° Capture</Text></View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => navigation.navigate("DirectPanoUpload", { listingId: "new_listing", listingTitle: data.title || "New Room" })}
                    >
                      <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><FolderOpen size={14} color={COLORS.ink} /><Text style={styles.secondaryText}>Or Upload Existing Panorama</Text></View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.stepTitle}>Where is it located?</Text>

              <Text style={styles.label}>Full address</Text>
              <TextInput
                style={styles.input}
                placeholder="House no, street, area"
                placeholderTextColor={COLORS.muted}
                value={data.address}
                onChangeText={(v) => update("address", v)}
              />

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City</Text>
                  <ScrollView style={styles.cityPicker} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[styles.cityOption, !data.city && styles.cityOptionActive]}
                      onPress={() => updateCity("")}
                    >
                      <Text style={[styles.cityOptionText, !data.city && styles.cityOptionTextActive]}>Select city and state</Text>
                    </TouchableOpacity>
                    {listingCityOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[styles.cityOption, data.city === opt.city && styles.cityOptionActive]}
                        onPress={() => updateCity(opt.city)}
                      >
                        <Text style={[styles.cityOptionText, data.city === opt.city && styles.cityOptionTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {data.state ? <Text style={styles.stateHint}>State: {data.state}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nearest landmark</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City College, DB Mall"
                    placeholderTextColor={COLORS.muted}
                    value={data.landmark}
                    onChangeText={(v) => update("landmark", v)}
                  />
                  <Text style={styles.label}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="77.412600"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    value={data.longitude}
                    onChangeText={(v) => update("longitude", v)}
                  />
                  <Text style={styles.label}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="23.259900"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    value={data.latitude}
                    onChangeText={(v) => update("latitude", v)}
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  RoomsFind uses this address, city, and landmark as searchable keywords. Users will see area,
                  price, photos, and owner contact.
                </Text>
              </View>

              <View style={styles.geoRow}>
                <TouchableOpacity style={[styles.geoPrimary, geocoding && { opacity: 0.7 }]} onPress={findCoordinates} disabled={geocoding}>
                  {geocoding ? <ActivityIndicator color="#fff" size="small" /> : <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><MapPin size={14} color="#fff" /><Text style={styles.geoPrimaryText}>Find coordinates</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.geoSecondary} onPress={useCurrentLocation}>
                  <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><LocateFixed size={14} color={COLORS.ink} /><Text style={styles.geoSecondaryText}>Use current location</Text></View>
                </TouchableOpacity>
              </View>

              {(data.longitude && data.latitude) || locationMessage ? (
                <View style={styles.locationInfo}>
                  {data.longitude && data.latitude && (
                    <Text style={styles.locationCoords}>
                      {Number(data.latitude || 0).toFixed(6)}, {Number(data.longitude || 0).toFixed(6)}
                    </Text>
                  )}
                  {locationMessage ? <Text style={styles.locationMsg}>{locationMessage}</Text> : null}
                </View>
              ) : null}
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={styles.stepTitle}>How can seekers reach you?</Text>

              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                placeholder="Sunita Sharma"
                placeholderTextColor={COLORS.muted}
                value={data.ownerName}
                onChangeText={(v) => update("ownerName", v)}
              />

              <Text style={styles.label}>Phone number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                  placeholder="9876543210"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={data.phone}
                  onChangeText={(v) => update("phone", v.replace(/\D/g, "").slice(0, 10))}
                />
              </View>

              <TouchableOpacity style={styles.chatRow} onPress={() => update("chatEnabled", !data.chatEnabled)} activeOpacity={0.8}>
                <View style={[styles.checkbox, data.chatEnabled && styles.checkboxActive]}>
                  {data.chatEnabled && <Text style={styles.checkTick}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatTitle}>Enable direct in-app chat for this listing</Text>
                  <Text style={styles.chatSub}>Seekers can message you directly on RoomsFind. You can manage chats anytime.</Text>
                </View>
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Nav */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.prevBtn, step === 1 && { opacity: 0.4 }]}
            onPress={() => setStep((c) => Math.max(1, c - 1))}
            disabled={step === 1}
          >
            <Text style={styles.prevText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepText}>Step {step} of {steps.length}</Text>
          {step < steps.length ? (
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep((c) => Math.min(steps.length, c + 1))}>
              <Text style={styles.nextText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.publishBtn, submitting && { opacity: 0.6 }]} onPress={publishListing} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishText}>Publish Listing</Text>}
            </TouchableOpacity>
          )}
        </View>
        {error && step !== 5 ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  guardSafe: { flex: 1, backgroundColor: COLORS.background },
  guardWrap: { flex: 1, justifyContent: "center", padding: 20 },
  guardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
  },
  guardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guardTitle: { color: COLORS.ink, fontSize: 22, fontWeight: "900", textAlign: "center" },
  guardSub: { color: "#64748b", fontSize: 13, fontWeight: "500", textAlign: "center", marginTop: 8, lineHeight: 18 },
  guardBtnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  guardPrimary: { backgroundColor: COLORS.brand, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 },
  guardPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  guardSecondary: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, backgroundColor: "#fff" },
  guardSecondaryText: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  stepIndicator: { color: COLORS.brand, fontSize: 12, fontWeight: "800" },
  progressBar: { height: 3, backgroundColor: COLORS.border, marginHorizontal: 16, borderRadius: 2, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", backgroundColor: COLORS.brand },
  stepperRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  stepperItem: { alignItems: "center", flex: 1, gap: 4 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  stepCircleActive: { borderColor: COLORS.brand, backgroundColor: "#fff" },
  stepCircleComplete: { borderColor: COLORS.brand, backgroundColor: COLORS.brand },
  stepCircleText: { color: "#94a3b8", fontSize: 13, fontWeight: "900" },
  stepCircleTextActive: { color: COLORS.brand },
  stepLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "800" },
  stepLabelActive: { color: COLORS.brand },
  stepLabelComplete: { color: COLORS.ink },
  scrollContent: { padding: 16, paddingBottom: 30 },
  stepContainer: { backgroundColor: COLORS.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  stepTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  stepSubtitle: { color: "#64748b", fontSize: 12, marginTop: 2, marginBottom: 12 },
  label: { color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginTop: 12, marginBottom: 6, textTransform: "uppercase" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.ink,
    fontSize: 13,
    marginBottom: 6,
  },
  row2: { flexDirection: "row", gap: 12 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  chip: { backgroundColor: "#f8fafc", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  selectedPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.brandSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  selectedPillText: { color: COLORS.brand, fontSize: 12, fontWeight: "900" },
  pillX: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ddd6fe" },
  customRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8 },
  addBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  addBtnText: { color: COLORS.ink, fontSize: 12, fontWeight: "800" },
  ruleChip: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#fff" },
  ruleChipText: { color: "#64748b", fontSize: 11, fontWeight: "800" },
  infoBox: { backgroundColor: COLORS.brandSoft, padding: 12, borderRadius: 12, marginTop: 12 },
  infoText: { color: "#475569", fontSize: 12, fontWeight: "600", lineHeight: 16 },
  uploadDashed: { borderWidth: 2, borderStyle: "dashed", borderColor: COLORS.border, borderRadius: 16, padding: 20, alignItems: "center", backgroundColor: "#f8fafc" },
  uploadTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", marginTop: 6 },
  uploadSub: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  uploadCount: { color: COLORS.brand, fontSize: 11, fontWeight: "800", marginTop: 4 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  photoWrap: { position: "relative" },
  photoThumb: { width: 90, height: 90, borderRadius: 12 },
  coverBadge: { position: "absolute", left: 4, top: 4, backgroundColor: COLORS.brand, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  coverText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  delPhotoBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  panoCard: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12, marginTop: 14 },
  panoTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  panoSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  panoSuccess: { backgroundColor: "#ecfdf5", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#a7f3d0", marginTop: 8 },
  panoSuccessText: { color: "#065f46", fontSize: 12, fontWeight: "800" },
  smallPrimary: { backgroundColor: COLORS.brand, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  smallPrimaryText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  guidedBtn: { backgroundColor: COLORS.brand, paddingVertical: 11, borderRadius: 12, alignItems: "center" },
  guidedText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  secondaryBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: COLORS.ink, fontSize: 12, fontWeight: "700" },
  cityPicker: { maxHeight: 140, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: "#fff" },
  cityOption: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  cityOptionActive: { backgroundColor: COLORS.brandSoft },
  cityOptionText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  cityOptionTextActive: { color: COLORS.brand, fontWeight: "800" },
  stateHint: { color: COLORS.brand, fontSize: 11, fontWeight: "700", marginTop: 6 },
  geoRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  geoPrimary: { flex: 1, backgroundColor: COLORS.ink, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  geoPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  geoSecondary: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  geoSecondaryText: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  locationInfo: { marginTop: 10, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10 },
  locationCoords: { color: COLORS.ink, fontSize: 12, fontWeight: "800" },
  locationMsg: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 4 },
  phoneRow: { flexDirection: "row", alignItems: "center" },
  phonePrefix: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRightWidth: 0, paddingHorizontal: 14, paddingVertical: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  phonePrefixText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  chatRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 14, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  checkTick: { color: "#fff", fontSize: 12, fontWeight: "900" },
  chatTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  chatSub: { color: "#64748b", fontSize: 11, fontWeight: "500", marginTop: 2, lineHeight: 14 },
  errorBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", padding: 12, borderRadius: 12, marginTop: 12 },
  errorText: { color: "#b91c1c", fontSize: 12, fontWeight: "700" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 10 },
  prevBtn: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 13, borderRadius: 999, alignItems: "center" },
  prevText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  stepText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  nextBtn: { flex: 1, backgroundColor: COLORS.brand, paddingVertical: 13, borderRadius: 999, alignItems: "center" },
  nextText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  publishBtn: { flex: 1, backgroundColor: "#059669", paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  publishText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
