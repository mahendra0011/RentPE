import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { DeviceMotion } from "expo-sensors";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import GyroTargetMarker from "../components/GyroTargetMarker";
import LevelIndicator from "../components/LevelIndicator";
import { CONFIG } from "../config";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Define 20 spherical target points across 3 rows for full ceiling-to-floor 360 coverage
function generate360Targets() {
  const targets = [];
  let id = 0;

  // Row 1: Top (Ceiling) — Pitch +40°, 6 yaw angles
  [0, 60, 120, 180, 240, 300].forEach((yaw) => {
    targets.push({ id: id++, row: "top", pitch: 40, yaw, label: "Ceiling" });
  });

  // Row 2: Middle (Eye-level) — Pitch 0°, 8 yaw angles
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((yaw) => {
    targets.push({ id: id++, row: "middle", pitch: 0, yaw, label: "Eye-Level" });
  });

  // Row 3: Bottom (Floor) — Pitch -40°, 6 yaw angles
  [0, 60, 120, 180, 240, 300].forEach((yaw) => {
    targets.push({ id: id++, row: "bottom", pitch: -40, yaw, label: "Floor" });
  });

  return targets;
}

export default function GuidedCaptureScreen({ route, navigation }) {
  const { listingId, listingTitle } = route.params || {};

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [targets, setTargets] = useState(generate360Targets);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // [{ uri, pitch, yaw, order, targetId }]
  const [isCapturing, setIsCapturing] = useState(false);

  // Live orientation from DeviceMotion
  const [orientation, setOrientation] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [alignedTarget, setAlignedTarget] = useState(null);
  const [holdTimer, setHoldTimer] = useState(0);

  const holdCounterRef = useRef(0);
  const isAutoCapturingRef = useRef(false);

  // Start DeviceMotion sensors
  useEffect(() => {
    DeviceMotion.setUpdateInterval(40); // 25Hz smooth tracking

    const subscription = DeviceMotion.addListener((data) => {
      if (!data?.rotation) return;

      // Convert radians to degrees
      // DeviceMotion Euler: beta (pitch), gamma (roll), alpha (yaw/compass)
      const radToDeg = 180 / Math.PI;
      const rawPitch = (data.rotation.beta || 0) * radToDeg;
      const rawRoll = (data.rotation.gamma || 0) * radToDeg;
      let rawYaw = (data.rotation.alpha || 0) * radToDeg;

      // Normalize yaw to [0, 360)
      rawYaw = ((rawYaw % 360) + 360) % 360;

      // Pitch is 0 when vertical in portrait; +90 tilt back (up), -90 tilt forward (down)
      const pitch = Math.max(-85, Math.min(85, rawPitch - 90));
      const roll = rawRoll;
      const yaw = rawYaw;

      setOrientation({ pitch, yaw, roll });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Compute nearest uncaptured target and alignment status
  const { nearestTarget, distanceToNearest, isAligned } = useMemo(() => {
    const uncaptured = targets.filter((t) => !capturedPhotos.some((p) => p.targetId === t.id));

    if (uncaptured.length === 0) {
      return { nearestTarget: null, distanceToNearest: 0, isAligned: false };
    }

    let minDistance = Infinity;
    let closest = uncaptured[0];

    for (const t of uncaptured) {
      // Angular delta in pitch
      const dp = Math.abs(orientation.pitch - t.pitch);

      // Shortest angular delta in yaw on 360° circle
      let dy = Math.abs(orientation.yaw - t.yaw);
      if (dy > 180) dy = 360 - dy;

      const totalDist = Math.sqrt(dp * dp + dy * dy);

      if (totalDist < minDistance) {
        minDistance = totalDist;
        closest = t;
      }
    }

    const aligned =
      minDistance <= CONFIG.ALIGNMENT_TOLERANCE_DEG &&
      Math.abs(orientation.roll) < 10; // phone held reasonably upright

    return {
      nearestTarget: closest,
      distanceToNearest: minDistance,
      isAligned: aligned };
  }, [targets, capturedPhotos, orientation]);

  // Auto-capture countdown logic
  useEffect(() => {
    if (isAligned && nearestTarget && !isCapturing && !isAutoCapturingRef.current) {
      setAlignedTarget(nearestTarget);
      holdCounterRef.current += 1;

      if (holdCounterRef.current === 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setHoldTimer(Math.min(100, holdCounterRef.current * 15));

      // After ~0.6 second of steady hold on the target: auto-snap!
      if (holdCounterRef.current >= 6) {
        triggerCapture(nearestTarget);
      }
    } else {
      holdCounterRef.current = 0;
      setHoldTimer(0);
      setAlignedTarget(null);
    }
  }, [isAligned, nearestTarget, isCapturing]);

  async function triggerCapture(targetPoint) {
    if (isCapturing || isAutoCapturingRef.current) return;
    isAutoCapturingRef.current = true;
    setIsCapturing(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let photoUri = null;

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: true });
        photoUri = photo.uri;
      } else {
        // Fallback placeholder URI for simulation/web
        photoUri = `https://picsum.photos/seed/room_${targetPoint.id}/1200/800`;
      }

      // Optimize and resize image with expo-image-manipulator
      let optimizedUri = photoUri;
      if (Platform.OS !== "web" && photoUri.startsWith("file:")) {
        const manipResult = await ImageManipulator.manipulateAsync(
          photoUri,
          [{ resize: { width: CONFIG.IMAGE_MAX_DIMENSION } }],
          { compress: CONFIG.IMAGE_COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
        );
        optimizedUri = manipResult.uri;
      }

      const newShot = {
        uri: optimizedUri,
        pitch: targetPoint.pitch,
        yaw: targetPoint.yaw,
        targetId: targetPoint.id,
        row: targetPoint.row,
        order: capturedPhotos.length };

      setCapturedPhotos((prev) => [...prev, newShot]);
      holdCounterRef.current = 0;
      setHoldTimer(0);
    } catch (err) {
      console.error("[GuidedCapture] Capture failed:", err);
    } finally {
      setIsCapturing(false);
      setTimeout(() => {
        isAutoCapturingRef.current = false;
      }, 400);
    }
  }

  // Guidance prompt text based on distance & angle
  function getGuidanceText() {
    if (!nearestTarget) return "All 360° targets captured! Ready to review.";
    if (isAligned) return "HOLD STEADY... LOCKING ON";

    const dp = nearestTarget.pitch - orientation.pitch;
    let dy = nearestTarget.yaw - orientation.yaw;
    if (dy > 180) dy -= 360;
    if (dy < -180) dy += 360;

    const parts = [];
    if (Math.abs(dp) > 4) {
      parts.push(dp > 0 ? `Tilt UP ${Math.round(dp)}°` : `Tilt DOWN ${Math.round(Math.abs(dp))}°`);
    }
    if (Math.abs(dy) > 4) {
      parts.push(dy > 0 ? `Turn RIGHT ${Math.round(dy)}°` : `Turn LEFT ${Math.round(Math.abs(dy))}°`);
    }

    return parts.length > 0 ? parts.join(" • ") : "Align with target circle";
  }

  if (!permission) {
    return <View style={styles.darkBg} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Camera size={32} color={COLORS.brand} />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permDesc}>
          RoomsFind requires camera access to capture 360° room panoramas.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progressPercent = Math.round((capturedPhotos.length / targets.length) * 100);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Live Camera Feed */}
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back">
        {/* Augmented Reality Reticle / Target Overlay */}
        <View style={styles.overlayLayer}>
          {/* Target Markers Projected Around HUD */}
          {targets.map((target) => {
            const isDone = capturedPhotos.some((p) => p.targetId === target.id);
            const isClosest = nearestTarget?.id === target.id;
            const isThisAligned = isClosest && isAligned;

            // Project 3D angular delta (pitch, yaw) onto 2D HUD screen coords
            let dyaw = target.yaw - orientation.yaw;
            if (dyaw > 180) dyaw -= 360;
            if (dyaw < -180) dyaw += 360;

            const dpitch = target.pitch - orientation.pitch;

            // Camera FOV mapping: ~65 deg HFOV, ~50 deg VFOV
            const screenX = SCREEN_WIDTH / 2 + (dyaw / 35) * (SCREEN_WIDTH / 2);
            const screenY = SCREEN_HEIGHT / 2 - (dpitch / 30) * (SCREEN_HEIGHT / 2);

            // Hide markers that are far outside screen frame
            if (
              screenX < -40 ||
              screenX > SCREEN_WIDTH + 40 ||
              screenY < -40 ||
              screenY > SCREEN_HEIGHT + 40
            ) {
              return null;
            }

            return (
              <View
                key={target.id}
                style={[
                  styles.markerWrapper,
                  {
                    left: screenX - 28,
                    top: screenY - 28 },
                ]}
              >
                <GyroTargetMarker
                  target={target}
                  isNearest={isClosest}
                  isAligned={isThisAligned}
                  isCaptured={isDone}
                  size={56}
                />
              </View>
            );
          })}

          {/* Center Crosshairs */}
          <View style={styles.crosshairCenter}>
            <View
              style={[
                styles.reticleRing,
                isAligned ? styles.reticleRingAligned : styles.reticleRingSearching,
              ]}
            >
              {holdTimer > 0 && (
                <View style={[styles.holdProgressRing, { width: `${holdTimer}%` }]} />
              )}
            </View>
          </View>
        </View>
      </CameraView>

      {/* Top HUD Bar */}
      <SafeAreaView style={styles.topHud}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>

          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              {capturedPhotos.length} / {targets.length} Captured
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.reviewHeaderBtn,
              capturedPhotos.length === 0 && styles.disabledBtn,
            ]}
            disabled={capturedPhotos.length === 0}
            onPress={() =>
              navigation.navigate("Review", {
                listingId,
                listingTitle,
                photos: capturedPhotos })
            }
          >
            <Text style={styles.reviewBtnText}>Review ({capturedPhotos.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Multi-Row Segment Progress */}
        <View style={styles.rowBadges}>
          <View
            style={[
              styles.rowBadge,
              capturedPhotos.filter((p) => p.row === "top").length === 6 && styles.rowBadgeComplete,
            ]}
          >
            <Text style={styles.rowBadgeText}>
              Ceiling: {capturedPhotos.filter((p) => p.row === "top").length}/6
            </Text>
          </View>
          <View
            style={[
              styles.rowBadge,
              capturedPhotos.filter((p) => p.row === "middle").length === 8 && styles.rowBadgeComplete,
            ]}
          >
            <Text style={styles.rowBadgeText}>
              Eye-Level: {capturedPhotos.filter((p) => p.row === "middle").length}/8
            </Text>
          </View>
          <View
            style={[
              styles.rowBadge,
              capturedPhotos.filter((p) => p.row === "bottom").length === 6 && styles.rowBadgeComplete,
            ]}
          >
            <Text style={styles.rowBadgeText}>
              Floor: {capturedPhotos.filter((p) => p.row === "bottom").length}/6
            </Text>
          </View>
        </View>

        {/* Level and Orientation Sensor Display */}
        <LevelIndicator
          pitch={orientation.pitch}
          roll={orientation.roll}
          yaw={orientation.yaw}
        />
      </SafeAreaView>

      {/* Bottom Guidance & Manual Shutter Bar */}
      <View style={styles.bottomHud}>
        {/* Dynamic Live Guidance Pill */}
        <View
          style={[
            styles.guidancePill,
            isAligned ? styles.guidancePillAligned : styles.guidancePillSearching,
          ]}
        >
          <Text
            style={[
              styles.guidanceText,
              isAligned ? styles.guidanceTextAligned : styles.guidanceTextSearching,
            ]}
          >
            {getGuidanceText()}
          </Text>
        </View>

        {/* Shutter and Action Controls */}
        <View style={styles.shutterRow}>
          {/* Snap Manually Button */}
          <TouchableOpacity
            style={[styles.manualShutterBtn, isCapturing && styles.disabledBtn]}
            disabled={isCapturing}
            onPress={() => {
              if (nearestTarget) {
                triggerCapture(nearestTarget);
              }
            }}
          >
            <View style={styles.shutterInnerCircle} />
          </TouchableOpacity>
        </View>

        <Text style={styles.autoCaptureNote}>
          ✨ Auto-capture triggers when aligned. Hold still for 1 second.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000" },
  darkBg: {
    flex: 1,
    backgroundColor: "#f8fafc" },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24 },
  permIcon: {
    fontSize: 52,
    marginBottom: 16 },
  permTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900" },
  permDesc: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20 },
  permBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12 },
  permBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800" },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject },
  markerWrapper: {
    position: "absolute",
    width: 56,
    height: 56 },
  crosshairCenter: {
    position: "absolute",
    left: SCREEN_WIDTH / 2 - 36,
    top: SCREEN_HEIGHT / 2 - 36,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center" },
  reticleRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center" },
  reticleRingSearching: {
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderStyle: "dashed" },
  reticleRingAligned: {
    borderColor: "#7c3aed",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    transform: [{ scale: 1.05 }] },
  holdProgressRing: {
    height: 4,
    backgroundColor: "#7c3aed",
    position: "absolute",
    bottom: -8,
    borderRadius: 2 },
  topHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 36 : 12,
    zIndex: 10 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center" },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20 },
  closeBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800" },
  progressPill: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20 },
  progressText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "800" },
  reviewHeaderBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20 },
  reviewBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800" },
  disabledBtn: {
    opacity: 0.4 },
  rowBadges: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8 },
  rowBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  rowBadgeComplete: {
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    borderColor: "#7c3aed" },
  rowBadgeText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "800" },
  bottomHud: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 20,
    alignItems: "center" },
  guidancePill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6 },
  guidancePillSearching: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "#38bdf8" },
  guidancePillAligned: {
    backgroundColor: "rgba(6, 78, 59, 0.95)",
    borderWidth: 1.5,
    borderColor: "#7c3aed" },
  guidanceText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4 },
  guidanceTextSearching: {
    color: "#38bdf8" },
  guidanceTextAligned: {
    color: "#6ee7b7" },
  shutterRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10 },
  manualShutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)" },
  shutterInnerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ffffff" },
  autoCaptureNote: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center" }
});
