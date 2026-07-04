import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest, toQueryString } from "@/lib/api.js";
import { normalizeRoom, normalizeRooms } from "@/lib/roomAdapter.js";

const storageKey = "rentpe:user-state";
const filterKey = "rentpe:filters";

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
      savedIds: state.savedIds,
      contactedIds: state.contactedIds,
      postedIds: state.postedIds,
    }),
  );
}

function readFilters() {
  try {
    return JSON.parse(localStorage.getItem(filterKey)) || {};
  } catch {
    return {};
  }
}

function writeFilters(filters) {
  localStorage.setItem(filterKey, JSON.stringify(filters));
}

export const fetchRooms = createAsyncThunk("rooms/fetchRooms", async (filters = {}) => {
  const query = toQueryString(filters);
  const rooms = await apiRequest(`/api/rooms${query ? `?${query}` : ""}`);
  return normalizeRooms(rooms);
});

export const fetchRoom = createAsyncThunk("rooms/fetchRoom", async (id) => {
  const room = await apiRequest(`/api/rooms/${id}`);
  return normalizeRoom(room);
});

export const reportRoom = createAsyncThunk("rooms/reportRoom", async ({ id, reason }) => {
  return apiRequest(`/api/rooms/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
});

const persisted = readSavedState();
const persistedFilters = readFilters();

const roomsSlice = createSlice({
  name: "rooms",
  initialState: {
    items: [],
    activeRoom: null,
    origin: null,
    status: "idle",
    error: "",
    savedIds: persisted.savedIds || [],
    contactedIds: persisted.contactedIds || [],
    postedIds: persisted.postedIds || [],
    filters: {
      city: persistedFilters.city || "",
      priceRange: persistedFilters.priceRange || [0, 100000],
      amenities: persistedFilters.amenities || [],
      sortBy: persistedFilters.sortBy || "newest",
      ...persistedFilters,
    },
  },
  reducers: {
    toggleSavedRoom(state, action) {
      const id = action.payload;
      state.savedIds = state.savedIds.includes(id)
        ? state.savedIds.filter((item) => item !== id)
        : [...state.savedIds, id];
      writeSavedState(state);
    },
    markContacted(state, action) {
      const id = action.payload;
      if (!state.contactedIds.includes(id)) {
        state.contactedIds.push(id);
      }
      writeSavedState(state);
    },
    markPosted(state, action) {
      const id = action.payload;
      if (!state.postedIds.includes(id)) {
        state.postedIds.push(id);
      }
      writeSavedState(state);
    },
    clearRoomError(state) {
      state.error = "";
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      writeFilters(state.filters);
    },
    clearFilters(state) {
      state.filters = {
        city: "",
        priceRange: [0, 100000],
        amenities: [],
        sortBy: "newest",
      };
      writeFilters(state.filters);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.origin = null;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchRoom.pending, (state) => {
        state.error = "";
      })
      .addCase(fetchRoom.fulfilled, (state, action) => {
        state.activeRoom = action.payload;
        const exists = state.items.some((room) => room.id === action.payload.id);
        if (!exists) {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchRoom.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { clearFilters, clearRoomError, markContacted, markPosted, setFilters, toggleSavedRoom } = roomsSlice.actions;
export default roomsSlice.reducer;
