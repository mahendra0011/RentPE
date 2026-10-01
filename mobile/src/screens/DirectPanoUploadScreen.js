import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { ApiService } from "../services/api";

export default function DirectPanoUploadScreen({ route, navigation }) {
  const { listingId, listingTitle } = route.params || {};

  const [selectedImage, setSelectedImage] = useState(null);
  const [directUrl, setDirectUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera roll access is needed to pick panorama photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9 });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  }

  async function handleUploadSelected() {
    if (!selectedImage) return;

    // Navigate to UploadProgress with the single photo batch
    navigation.navigate("UploadProgress", {
      listingId,
      listingTitle,
      photos: [
        {
          uri: selectedImage.uri,
          pitch: 0,
          yaw: 0,
          order: 0 },
      ],
      metadata: [{ pitch: 0, yaw: 0, order: 0 }] });
  }

  async function handleAttachUrl() {
    if (!directUrl.trim()) {
      Alert.alert("URL required", "Please enter a valid equirectangular panorama image URL.");
      return;
    }

    setUploading(true);
    try {
      await ApiService.attachDirectUrl(listingId, directUrl.trim());
      Alert.alert(
        "Success!",
        "360° virtual tour has been added to your listing on RoomsFind.",
        [
          {
            text: "Back to My Listings",
            onPress: () => navigation.navigate("MyListings") },
        ]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to attach panorama URL.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instant 360° Upload</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.listingLabel}>FOR LISTING</Text>
        <Text style={styles.listingTitle}>{listingTitle || listingId}</Text>
        <Text style={styles.explainer}>
          Upload a panorama photo taken using your phone camera's built-in PANO mode, a Ricoh Theta,
          Insta360, or any 360 camera.
        </Text>

        {/* Gallery Pick Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Option 1: Choose from Camera Roll</Text>
          <Text style={styles.cardDesc}>
            Select an equirectangular or wide panorama photo from your device.
          </Text>

          {selectedImage ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              <View style={styles.previewMeta}>
                <Text style={styles.previewMetaText}>
                  Resolution: {selectedImage.width} x {selectedImage.height}
                </Text>
                <TouchableOpacity onPress={() => setSelectedImage(null)}>
                  <Text style={styles.removeText}>Change</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleUploadSelected}>
                <Text style={styles.primaryBtnText}>Upload & Process 360° View</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.pickerBox} onPress={handlePickImage}>
              <Text style={styles.pickerIcon}>🖼️</Text>
              <Text style={styles.pickerTitle}>Tap to select panoramic photo</Text>
              <Text style={styles.pickerSubtitle}>Supports JPG, PNG (up to 15MB)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Direct URL Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Option 2: Direct 360° Image URL</Text>
          <Text style={styles.cardDesc}>
            Already have a hosted 360° photo? Paste the equirectangular URL.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="https://images.unsplash.com/... or Cloudinary URL"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={directUrl}
            onChangeText={setDirectUrl}
          />

          <TouchableOpacity
            style={[styles.secondaryBtn, uploading && styles.disabledBtn]}
            onPress={handleAttachUrl}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.secondaryBtnText}>Attach 360° Tour to Listing</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    padding: 20 },
  listingLabel: {
    color: "#7c3aed",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1 },
  listingTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
    marginBottom: 8 },
  explainer: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  cardTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800" },
  cardDesc: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14 },
  pickerBox: {
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.05)" },
  pickerIcon: {
    fontSize: 32,
    marginBottom: 8 },
  pickerTitle: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "800" },
  pickerSubtitle: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4 },
  previewBox: {
    borderRadius: 12,
    overflow: "hidden" },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    resizeMode: "cover" },
  previewMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10 },
  previewMetaText: {
    color: "#94a3b8",
    fontSize: 12 },
  removeText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700" },
  primaryBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6 },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800" },
  input: {
    backgroundColor: "#0d1424",
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 13,
    marginBottom: 12 },
  secondaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center" },
  secondaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800" },
  disabledBtn: {
    opacity: 0.5 }
});
