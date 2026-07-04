import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { geocodeAddress, getRouteGeoJson } from "@/lib/mapServices.js";

const storageKey = "rentpe:map-state";

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function writeSavedState(state) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      recentSearches: state.recentSearches,
      savedLocations: state.savedLocations,
    }),
  );
}

export const geocode = createAsyncThunk(
  "map/geocode",
  async (query) => {
    return geocodeAddress(query);
  },
);

export const fetchRoute = createAsyncThunk(
  "map/fetchRoute",
  async ({ start, end, profile }) => {
    return getRouteGeoJson({ start, end, profile });
  },
);

const persisted = readSavedState();

const mapSlice = createSlice({
  name: "map",
  initialState: {
    selectedLocation: null,
    mapBounds: null,
    routeGeoJson: null,
    recentSearches: persisted.recentSearches || [],
    savedLocations: persisted.savedLocations || [],
    status: "idle",
    error: "",
  },
  reducers: {
    setSelectedLocation(state, action) {
      state.selectedLocation = action.payload;
    },
    setMapBounds(state, action) {
      state.mapBounds = action.payload;
    },
    addRecentSearch(state, action) {
      const query = action.payload;
      state.recentSearches = [
        query,
        ...state.recentSearches.filter((s) => s !== query),
      ].slice(0, 10);
      writeSavedState(state);
    },
    clearRecentSearches(state) {
      state.recentSearches = [];
      writeSavedState(state);
    },
    toggleSavedLocation(state, action) {
      const location = action.payload;
      const exists = state.savedLocations.some(
        (l) => l.label === location.label,
      );
      if (exists) {
        state.savedLocations = state.savedLocations.filter(
          (l) => l.label !== location.label,
        );
      } else {
        state.savedLocations.push(location);
      }
      writeSavedState(state);
    },
    clearMapError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(geocode.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(geocode.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selectedLocation = action.payload;
      })
      .addCase(geocode.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchRoute.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchRoute.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.routeGeoJson = action.payload;
      })
      .addCase(fetchRoute.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const {
  addRecentSearch,
  clearMapError,
  clearRecentSearches,
  setMapBounds,
  setSelectedLocation,
  toggleSavedLocation,
} = mapSlice.actions;
export default mapSlice.reducer;
