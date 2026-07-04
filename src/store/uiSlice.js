import { createSlice } from "@reduxjs/toolkit";

import { getCityFromStorage, saveCityToStorage } from "@/lib/listingMeta.js";

const themeKey = "rentpe:theme";

function readTheme() {
  try {
    return localStorage.getItem(themeKey) || "";
  } catch {
    return "";
  }
}

function writeTheme(mode) {
  try {
    localStorage.setItem(themeKey, mode);
  } catch {
    // ignore
  }
}

function getInitialTheme() {
  const stored = readTheme();
  if (stored === "dark" || stored === "light") return stored === "dark";
  if (typeof window !== "undefined") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    darkMode: getInitialTheme(),
    menuOpen: false,
    selectedCity: getCityFromStorage() || "",
    detectingCity: false,
  },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      writeTheme(state.darkMode ? "dark" : "light");
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", state.darkMode);
      }
    },
    setDarkMode(state, action) {
      state.darkMode = action.payload;
      writeTheme(action.payload ? "dark" : "light");
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", action.payload);
      }
    },
    setMenuOpen(state, action) {
      state.menuOpen = action.payload;
    },
    toggleMenu(state) {
      state.menuOpen = !state.menuOpen;
    },
    setSelectedCity(state, action) {
      state.selectedCity = action.payload;
      saveCityToStorage(action.payload);
    },
    setDetectingCity(state, action) {
      state.detectingCity = action.payload;
    },
  },
});

export const {
  setDarkMode,
  setDetectingCity,
  setMenuOpen,
  setSelectedCity,
  toggleDarkMode,
  toggleMenu,
} = uiSlice.actions;
export default uiSlice.reducer;
