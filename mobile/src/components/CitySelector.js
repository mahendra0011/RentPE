import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { MapPin, Search, LocateFixed, X } from "lucide-react-native";
import { COLORS } from "../theme";
import { CITY_STORAGE_KEY as LIB_STORAGE_KEY, cityOptions, saveCityToStorage as libSaveCityToStorage } from "../lib/listingMeta";

// Re-export single source for consumers (HomeScreen imports this)
export const CITY_STORAGE_KEY = LIB_STORAGE_KEY;
export const CITY_OPTIONS = cityOptions;

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCitySearchText(c) {
  return normalize([c.city, c.state, c.label, ...(c.aliases || [])].join(" "));
}

async function saveCityToStorage(city) {
  return libSaveCityToStorage(city);
}

export function CitySelector({ visible, onClose, onSelect, selectedCity }) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q.trim()) return cityOptions.slice(0, 80);
    return cityOptions.filter((c) => getCitySearchText(c).includes(q)).slice(0, 80);
  }, [query]);

  async function handleLocate() {
    setLocating(true);
    try {
      let Location;
      try {
        Location = require("expo-location");
      } catch (e) {
        Alert.alert("Location", "Location services not available in this build. Defaulting to Bhopal.");
        await saveCityToStorage("Bhopal");
        onSelect("Bhopal");
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required to detect your city.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const addr = results?.[0];
      const candidates = [
        addr?.city,
        addr?.subregion,
        addr?.district,
        addr?.region,
        addr?.name,
      ].filter(Boolean);
      let detected = null;
      for (const cand of candidates) {
        const n = normalize(cand);
        const match = cityOptions.find((c) => getCitySearchText(c).split(" ").includes(n) || normalize(c.city) === n || (c.aliases || []).some((a) => normalize(a) === n));
        if (match) { detected = match.city; break; }
        const fuzzy = cityOptions.find((c) => normalize(c.city).includes(n) || n.includes(normalize(c.city)));
        if (fuzzy) { detected = fuzzy.city; break; }
      }
      if (!detected && addr?.city) detected = addr.city;
      if (detected) {
        await saveCityToStorage(detected);
        onSelect(detected);
      } else {
        Alert.alert("Location", "Could not detect city from your location. Please select manually.");
      }
    } catch (err) {
      Alert.alert("Location error", err?.message || "Failed to get location");
    } finally {
      setLocating(false);
    }
  }

  function handleSelect(city) {
    saveCityToStorage(city);
    onSelect(city);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select City</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={18} color={COLORS.ink} /></TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <Search size={16} color="#94a3b8" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search city, state, alias (e.g. Bangalore, Bombay, Gurgaon)..." placeholderTextColor="#94a3b8" style={styles.input} autoFocus />
        </View>
        <TouchableOpacity style={styles.locateBtn} onPress={handleLocate} disabled={locating}>
          {locating ? <ActivityIndicator size="small" color={COLORS.brand} /> : <LocateFixed size={16} color={COLORS.brand} />}
          <Text style={styles.locateText}>{locating ? "Detecting location..." : "Use my current location"}</Text>
        </TouchableOpacity>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.label}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = selectedCity === item.city;
            return (
              <TouchableOpacity style={[styles.cityRow, active && styles.cityRowActive]} onPress={() => handleSelect(item.city)}>
                <MapPin size={14} color={active ? "#fff" : COLORS.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cityName, active && styles.cityNameActive]}>{item.city}</Text>
                  <Text style={[styles.stateName, active && { color: "rgba(255,255,255,0.8)" }]}>{item.state}{item.aliases ? ` • alias: ${item.aliases.join(", ")}` : ""}</Text>
                </View>
                {active && <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: "900", color: COLORS.ink },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, margin: 16, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, color: COLORS.ink, fontWeight: "700", fontSize: 13 },
  locateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.brandSoft, borderWidth: 1, borderColor: "rgba(124,58,237,0.2)", marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12 },
  locateText: { color: COLORS.brand, fontWeight: "900" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderColor: "#f1f5f9", backgroundColor: "#fff" },
  cityRowActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  cityName: { fontWeight: "800", color: COLORS.ink },
  cityNameActive: { color: "#fff" },
  stateName: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
