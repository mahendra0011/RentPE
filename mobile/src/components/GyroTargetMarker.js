import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

export default function GyroTargetMarker({
  target,
  isNearest = false,
  isAligned = false,
  isCaptured = false,
  size = 56
}) {
  const strokeColor = isCaptured
    ? "#7c3aed" // Emerald green
    : isAligned
    ? "#7c3aed" // Bright emerald lock-on
    : isNearest
    ? "#38bdf8" // Cyan nearest target
    : "rgba(255, 255, 255, 0.4)"; // Muted white pending

  const fillColor = isCaptured
    ? "rgba(16, 185, 129, 0.3)"
    : isAligned
    ? "rgba(52, 211, 153, 0.45)"
    : "rgba(15, 23, 42, 0.4)";

  const center = size / 2;
  const radius = center - 4;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer targeting ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={isAligned ? 3 : 2}
          fill={fillColor}
          strokeDasharray={isCaptured ? undefined : isAligned ? undefined : "4, 3"}
        />

        {/* Reticle Crosshairs */}
        <Line
          x1={center}
          y1={center - 8}
          x2={center}
          y2={center + 8}
          stroke={strokeColor}
          strokeWidth={2}
        />
        <Line
          x1={center - 8}
          y1={center}
          x2={center + 8}
          y2={center}
          stroke={strokeColor}
          strokeWidth={2}
        />

        {/* Center dot */}
        <Circle
          cx={center}
          cy={center}
          r={isAligned ? 4 : 2.5}
          fill={isCaptured ? "#7c3aed" : isAligned ? "#7c3aed" : "#ffffff"}
        />
      </Svg>

      <Text
        style={[
          styles.label,
          {
            color: isCaptured ? "#7c3aed" : isAligned ? "#6ee7b7" : "#cbd5e1" },
        ]}
      >
        {isCaptured ? "✓" : `${Math.round(target.yaw)}°`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center" },
  label: {
    position: "absolute",
    bottom: -16,
    fontSize: 10,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3 }
});
