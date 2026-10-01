import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function ReviewScreen({ route, navigation }) {
  const { listingId, listingTitle, photos: initialPhotos = [] } = route.params || {};
  const [photos, setPhotos] = useState(initialPhotos);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  function handleDeletePhoto(targetId) {
    Alert.alert("Remove Shot", "Do you want to retake this angle?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setPhotos((prev) => prev.filter((p) => p.targetId !== targetId));
          setPreviewPhoto(null);
        } },
    ]);
  }

  function handleProceedToUpload() {
    if (photos.length === 0) {
      Alert.alert("No photos", "Please capture photos before uploading.");
      return;
    }

    const metadata = photos.map((p, idx) => ({
      pitch: p.pitch,
      yaw: p.yaw,
      order: idx }));

    navigation.navigate("UploadProgress", {
      listingId,
      listingTitle,
      photos,
      metadata });
  }

  function renderPhotoCard({ item, index }) {
    return (
      <TouchableOpacity
        style={styles.photoCard}
        onPress={() => setPreviewPhoto(item)}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbnail} />
        <View style={styles.badgeRow}>
          <Text style={styles.rowLabel}>{item.row?.toUpperCase()}</Text>
          <Text style={styles.angleLabel}>{Math.round(item.yaw)}°</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const ceilingCount = photos.filter((p) => p.row === "top").length;
  const eyeCount = photos.filter((p) => p.row === "middle").length;
  const floorCount = photos.filter((p) => p.row === "bottom").length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Camera</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review 360° Shots</Text>
        <TouchableOpacity
          style={styles.retakeAllBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retakeAllText}>+ Add More</Text>
        </TouchableOpacity>
      </View>

      {/* Coverage Status Bar */}
      <View style={styles.coverageBox}>
        <View style={styles.coverageRow}>
          <Text style={styles.coverageTitle}>Spherical Coverage</Text>
          <Text style={styles.coverageCount}>{photos.length} / 20 Shots</Text>
        </View>
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Ceiling: {ceilingCount}/6</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Eye-Level: {eyeCount}/8</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Floor: {floorCount}/6</Text>
          </View>
        </View>
      </View>

      {/* Photos Grid */}
      <FlatList
        data={photos}
        keyExtractor={(item, index) => `${item.targetId || index}`}
        numColumns={3}
        renderItem={renderPhotoCard}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No photos captured yet.</Text>
          </View>
        }
      />

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.uploadBtn, photos.length === 0 && styles.disabledBtn]}
          disabled={photos.length === 0}
          onPress={handleProceedToUpload}
        >
          <Text style={styles.uploadBtnText}>
            Stitch & Upload 360° Tour ({photos.length} photos)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full-Photo Preview Modal */}
      {previewPhoto && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewPhoto(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Image source={{ uri: previewPhoto.uri }} style={styles.modalImage} />
              <View style={styles.modalInfo}>
                <Text style={styles.modalTitle}>
                  {previewPhoto.row?.toUpperCase()} ROW • {Math.round(previewPhoto.yaw)}° YAW (Pitch {Math.round(previewPhoto.pitch)}°)
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => handleDeletePhoto(previewPhoto.targetId)}
                  >
                    <Text style={styles.modalDeleteText}>🗑 Remove Shot</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setPreviewPhoto(null)}
                  >
                    <Text style={styles.modalCloseText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0" },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10 },
  backBtnText: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "700" },
  headerTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800" },
  retakeAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10 },
  retakeAllText: {
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: "700" },
  coverageBox: {
    backgroundColor: "#ffffff",
    margin: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  coverageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8 },
  coverageTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800" },
  coverageCount: {
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: "900" },
  pillsRow: {
    flexDirection: "row",
    gap: 6 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  pillText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700" },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 80 },
  photoCard: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff" },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover" },
  badgeRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 3 },
  rowLabel: {
    color: "#94a3b8",
    fontSize: 8,
    fontWeight: "900" },
  angleLabel: {
    color: "#7c3aed",
    fontSize: 9,
    fontWeight: "900" },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center" },
  emptyText: {
    color: "#64748b",
    fontSize: 14 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#e2e8f0" },
  uploadBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center" },
  uploadBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800" },
  disabledBtn: {
    opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    padding: 16 },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden" },
  modalImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    backgroundColor: "#000000" },
  modalInfo: {
    padding: 16 },
  modalTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center" },
  modalActions: {
    flexDirection: "row",
    gap: 10 },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center" },
  modalDeleteText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "800" },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: "#334155",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center" },
  modalCloseText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800" }
});
