import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api.js";

export const fetchBookings = createAsyncThunk(
  "booking/fetchBookings",
  async (filters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, String(value));
    });
    const qs = query.toString();
    return apiRequest(`/api/bookings${qs ? `?${qs}` : ""}`);
  },
);

export const createBooking = createAsyncThunk(
  "booking/createBooking",
  async ({ roomId, message, moveInDate, duration }) => {
    return apiRequest("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, message, moveInDate, duration }),
    });
  },
);

export const updateBooking = createAsyncThunk(
  "booking/updateBooking",
  async ({ bookingId, status }) => {
    return apiRequest(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
);

export const cancelBooking = createAsyncThunk(
  "booking/cancelBooking",
  async (bookingId) => {
    return apiRequest(`/api/bookings/${bookingId}`, {
      method: "DELETE",
    });
  },
);

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    bookings: [],
    activeBooking: null,
    status: "idle",
    error: "",
  },
  reducers: {
    setActiveBooking(state, action) {
      state.activeBooking = action.payload;
    },
    clearBookingError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.bookings = action.payload.bookings || action.payload;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(createBooking.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.bookings.push(action.payload.booking || action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        const updated = action.payload.booking || action.payload;
        const index = state.bookings.findIndex(
          (b) => (b._id || b.id) === (updated._id || updated.id),
        );
        if (index !== -1) {
          state.bookings[index] = { ...state.bookings[index], ...updated };
        }
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const deleted = action.payload.booking || action.payload;
        state.bookings = state.bookings.filter(
          (b) => (b._id || b.id) !== (deleted._id || deleted.id),
        );
      });
  },
});

export const { clearBookingError, setActiveBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
