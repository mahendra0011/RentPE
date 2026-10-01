import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ApiService } from "../services/api";

export const fetchRooms = createAsyncThunk("rooms/fetchRooms", async (filters = {}) => {
  const data = await ApiService.getRooms(filters);
  return data;
});

export const fetchRoomDetails = createAsyncThunk("rooms/fetchRoomDetails", async (slug) => {
  const data = await ApiService.getRoomDetails(slug);
  return data;
});

const initialState = {
  items: [],
  selectedRoom: null,
  loading: false,
  detailsLoading: false,
  error: null,
  filters: {
    city: "Bhopal",
    roomType: "",
    gender: "",
    priceMax: null,
    query: "" },
  page: 1,
  totalPages: 1,
  total: 0,
  // website parity for Dashboard – saved/contacted/posted track local user activity
  savedIds: [],
  contactedIds: [],
  postedIds: []
};

const roomsSlice = createSlice({
  name: "rooms",
  initialState,
  reducers: {
    setFilter(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
    clearSelectedRoom(state) {
      state.selectedRoom = null;
    },
    toggleSavedRoom(state, action) {
      const id = String(action.payload);
      if (state.savedIds.includes(id)) state.savedIds = state.savedIds.filter((x) => x !== id);
      else state.savedIds.push(id);
    },
    markContacted(state, action) {
      const id = String(action.payload);
      if (!state.contactedIds.includes(id)) state.contactedIds.push(id);
    },
    markPosted(state, action) {
      const id = String(action.payload);
      if (!state.postedIds.includes(id)) state.postedIds.push(id);
    } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        if (payload && Array.isArray(payload.rooms)) {
          state.items = payload.rooms;
          state.page = payload.page || 1;
          state.totalPages = payload.totalPages || 1;
          state.total = payload.total || payload.rooms.length;
        } else if (Array.isArray(payload)) {
          state.items = payload;
          state.total = payload.length;
        }
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load rooms";
      })
      .addCase(fetchRoomDetails.pending, (state) => {
        state.detailsLoading = true;
      })
      .addCase(fetchRoomDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.selectedRoom = action.payload;
      })
      .addCase(fetchRoomDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.error.message || "Failed to load room details";
      });
  }
});

export const { setFilter, resetFilters, clearSelectedRoom, toggleSavedRoom, markContacted, markPosted } = roomsSlice.actions;
export default roomsSlice.reducer;
