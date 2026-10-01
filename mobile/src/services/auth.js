import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "roomsfind_jwt_token";
const USER_KEY = "roomsfind_user_profile";

// In-memory fallback if SecureStore is not supported on web/dev
const memoryStorage = new Map();

async function setItem(key, value) {
  try {
    if (Platform.OS === "web") {
      memoryStorage.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    memoryStorage.set(key, value);
  }
}

async function getItem(key) {
  try {
    if (Platform.OS === "web") {
      return memoryStorage.get(key) || null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    return memoryStorage.get(key) || null;
  }
}

async function deleteItem(key) {
  try {
    if (Platform.OS === "web") {
      memoryStorage.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    memoryStorage.delete(key);
  }
}

export const AuthService = {
  async saveAuthData(token, user) {
    if (token) await setItem(TOKEN_KEY, token);
    if (user) await setItem(USER_KEY, JSON.stringify(user));
  },

  async getToken() {
    return await getItem(TOKEN_KEY);
  },

  async getUser() {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async clearAuth() {
    await deleteItem(TOKEN_KEY);
    await deleteItem(USER_KEY);
  }
};
