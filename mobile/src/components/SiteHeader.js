import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { COLORS, FONTS } from "../theme";

/**
 * Mirrors website src/components/SiteHeader.jsx Logo + city
 * Website: bg-brand circle + "RoomsFind" text-ink
 */
export function SiteHeader({ city = "Bhopal", onCityPress, onProfilePress, unreadCount = 0 }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <View style={styles.logoCircle}>
          <MapPin size={16} color="#ffffff" strokeWidth={2.6} />
        </View>
        <Text style={styles.logoText}>RoomsFind</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cityPill} onPress={onCityPress}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={12} color={COLORS.ink} />
            <Text style={styles.cityPillText}>{city}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileBtn} onPress={onProfilePress}>
          <Text>👤</Text>
          {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: COLORS.border },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8 },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8 },
  logoText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.ink,
    letterSpacing: -0.3 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10 },
  cityPill: {
    backgroundColor: COLORS.mutedSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20 },
  cityPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.ink,
    fontFamily: FONTS.bold },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3 },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900" } });
