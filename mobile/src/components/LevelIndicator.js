import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LevelIndicator({ pitch = 0, roll = 0, yaw = 0 }) {
  const isLevel = Math.abs(roll) < 3.5;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.label}>PITCH</Text>
          <Text style={styles.value}>{Math.round(pitch)}°</Text>
        </View>

        <View style={[styles.badge, isLevel ? styles.badgeGood : styles.badgeWarn]}>
          <Text style={styles.label}>ROLL</Text>
          <Text style={[styles.value, isLevel ? styles.valueGood : styles.valueWarn]}>
            {Math.round(roll)}° {isLevel ? "✓" : "!"}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.label}>YAW</Text>
          <Text style={styles.value}>{Math.round(yaw)}°</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4 },
  row: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  badge: {
    alignItems: "center",
    minWidth: 46 },
  badgeGood: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 4 },
  badgeWarn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 4 },
  label: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94a3b8",
    letterSpacing: 0.5 },
  value: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff" },
  valueGood: {
    color: "#7c3aed" },
  valueWarn: {
    color: "#fbbf24" }
});
