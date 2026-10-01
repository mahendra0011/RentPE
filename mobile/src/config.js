import { Platform } from "react-native";
import Constants from "expo-constants";

// Physical device (Expo Go via QR exp://10.95.210.212:8081) needs LAN IP, not 10.0.2.2.
// Try to derive LAN IP from expo hostUri, fallback to emulator/localhost.
function getDevHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.tool;
  // hostUri like "10.95.210.212:8081"
  if (typeof hostUri === "string" && hostUri.includes(":")) {
    const ip = hostUri.split(":")[0];
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ip) && ip !== "127.0.0.1" && ip !== "10.0.2.2") {
      return `http://${ip}:5000`;
    }
  }
  // Fallback: emulator vs simulator
  return Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
}

const DEV_HOST = getDevHost();

export const CONFIG = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || DEV_HOST,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || DEV_HOST,
  // Angle alignment tolerance in degrees (pitch and yaw)
  ALIGNMENT_TOLERANCE_DEG: 7.5,
  // Photo quality settings for expo-image-manipulator
  IMAGE_MAX_DIMENSION: 1600,
  IMAGE_COMPRESS_QUALITY: 0.82
};
