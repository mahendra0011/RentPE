import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ApiService } from "../services/api";
import { SocketService } from "../services/socket";

export default function UploadProgressScreen({ route, navigation }) {
  const { listingId, listingTitle, photos = [], metadata = [] } = route.params || {};

  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState("uploading"); // uploading, stitching, completed, failed
  const [statusMessage, setStatusMessage] = useState("Preparing photo batch...");
  const [jobId, setJobId] = useState(null);
  const [panoramaUrl, setPanoramaUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    startUploadFlow();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  async function startUploadFlow() {
    try {
      setStatusMessage("Uploading photos and orientation data...");

      // 1. Upload photos to backend
      const uploadResult = await ApiService.uploadPanoramaBatch({
        listingId,
        photos,
        metadata,
        onUploadProgress: (percent) => {
          setUploadProgress(percent);
          if (percent < 100) {
            setStatusMessage(`Uploading photos (${percent}%)...`);
          } else {
            setStatusMessage("Processing photos on server worker...");
          }
        } });

      const currentJobId = uploadResult?.jobId;
      setJobId(currentJobId);
      setStage("stitching");
      setStatusMessage("Photos received. Aligning angles and stitching spherical panorama in worker thread...");

      // 2. Connect to Socket.io for live updates
      setupSocketListeners(currentJobId);

      // 3. Fallback polling every 2.5s
      pollIntervalRef.current = setInterval(async () => {
        if (!currentJobId) return;
        try {
          const job = await ApiService.getJobStatus(currentJobId);
          if (job) {
            if (job.status === "completed") {
              handleJobCompleted(job.panoramaUrl);
            } else if (job.status === "failed") {
              handleJobFailed(job.error || "Stitching failed.");
            } else if (job.message) {
              setStatusMessage(job.message);
            }
          }
        } catch {
          // ignore transient polling errors
        }
      }, 2500);
    } catch (err) {
      console.error("[UploadProgress] Upload error:", err);
      handleJobFailed(err.message || "Upload failed. Please check network connection.");
    }
  }

  async function setupSocketListeners(currentJobId) {
    try {
      await SocketService.connect();

      SocketService.on("panorama:progress", (data) => {
        if (data.jobId === currentJobId) {
          setStatusMessage(data.message || "Stitching in progress...");
        }
      });

      SocketService.on("panorama:complete", (data) => {
        if (data.jobId === currentJobId) {
          handleJobCompleted(data.panoramaUrl);
        }
      });

      SocketService.on("panorama:failed", (data) => {
        if (data.jobId === currentJobId) {
          handleJobFailed(data.error);
        }
      });
    } catch (err) {
      console.warn("[UploadProgress] Socket connection notice:", err.message);
    }
  }

  function handleJobCompleted(url) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStage("completed");
    setPanoramaUrl(url);
    setStatusMessage("Stitching complete! Your 360° virtual tour is live.");
  }

  function handleJobFailed(err) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStage("failed");
    setErrorMessage(err || "Panorama stitching failed.");
    setStatusMessage("Stitching process encountered an error.");
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>360° Stitching Studio</Text>
      </View>

      <View style={styles.content}>
        {/* State Icon */}
        <View
          style={[
            styles.iconCircle,
            stage === "completed"
              ? styles.iconCircleSuccess
              : stage === "failed"
              ? styles.iconCircleFailed
              : styles.iconCircleProcessing,
          ]}
        >
          <Text style={styles.iconEmoji}>
            {stage === "completed" ? "" : stage === "failed" ? "" : ""}
          </Text>
        </View>

        {/* Title & Listing */}
        <Text style={styles.title}>
          {stage === "completed"
            ? "360° Tour Ready!"
            : stage === "failed"
            ? "Stitching Failed"
            : "Stitching Panorama"}
        </Text>

        <Text style={styles.listingText} numberOfLines={1}>
          Property: {listingTitle || listingId}
        </Text>

        {/* Progress Bar for upload */}
        {stage === "uploading" && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressPct}>{uploadProgress}%</Text>
          </View>
        )}

        {/* Activity indicator while stitching */}
        {stage === "stitching" && (
          <View style={styles.spinnerRow}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.workerBadge}>Node.js Worker Thread Active</Text>
          </View>
        )}

        {/* Status message */}
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{statusMessage}</Text>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>

        {/* Preview of completed panorama */}
        {stage === "completed" && panoramaUrl && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: panoramaUrl }} style={styles.panoramaPreview} />
            <Text style={styles.previewTag}>Interactive 360° Panorama</Text>
          </View>
        )}

        {/* Step Breakdown */}
        <View style={styles.stepsCard}>
          <View style={styles.stepItem}>
            <Text style={styles.stepCheck}>✓</Text>
            <Text style={styles.stepText}>Photos captured with orientation metadata</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={stage !== "uploading" ? styles.stepCheck : styles.stepWait}>
              {stage !== "uploading" ? "✓" : "⏳"}
            </Text>
            <Text style={styles.stepText}>Uploaded batch to RentPE server</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={stage === "completed" ? styles.stepCheck : stage === "stitching" ? styles.stepActive : styles.stepWait}>
              {stage === "completed" ? "✓" : stage === "stitching" ? "⚙️" : "⏳"}
            </Text>
            <Text style={styles.stepText}>Worker thread spherical blending</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={stage === "completed" ? styles.stepCheck : styles.stepWait}>
              {stage === "completed" ? "✓" : "⏳"}
            </Text>
            <Text style={styles.stepText}>Saved to room & published to web viewer</Text>
          </View>
        </View>
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        {stage === "completed" ? (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate("MyListings")}
          >
            <Text style={styles.doneBtnText}>Done • Back to My Properties</Text>
          </TouchableOpacity>
        ) : stage === "failed" ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryBtnText}>← Back to Review & Retry</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.waitNotice}>
            Stitching runs asynchronously in the background. You may exit or wait here.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center" },
  headerTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800" },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2 },
  iconCircleProcessing: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#38bdf8" },
  iconCircleSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "#7c3aed" },
  iconCircleFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "#ef4444" },
  iconEmoji: {
    fontSize: 36 },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900" },
  listingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16 },
  progressContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 10 },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#ffffff",
    borderRadius: 4,
    overflow: "hidden" },
  progressFill: {
    height: "100%",
    backgroundColor: "#38bdf8" },
  progressPct: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "800",
    minWidth: 36 },
  spinnerRow: {
    alignItems: "center",
    marginVertical: 12 },
  workerBadge: {
    color: "#7c3aed",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8 },
  messageBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    width: "100%",
    marginVertical: 12 },
  messageText: {
    color: "#cbd5e1",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18 },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center" },
  previewContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8 },
  panoramaPreview: {
    width: "100%",
    height: 120,
    resizeMode: "cover" },
  previewTag: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#7c3aed",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6 },
  stepsCard: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 12,
    padding: 14,
    marginTop: "auto",
    gap: 8 },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10 },
  stepCheck: {
    color: "#7c3aed",
    fontSize: 14,
    fontWeight: "900" },
  stepActive: {
    fontSize: 12 },
  stepWait: {
    fontSize: 12,
    color: "#64748b" },
  stepText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600" },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#e2e8f0" },
  doneBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center" },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800" },
  retryBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center" },
  retryBtnText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "800" },
  waitNotice: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center" }
});
