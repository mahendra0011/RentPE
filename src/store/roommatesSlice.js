import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest, toQueryString } from "@/lib/api.js";

export const fetchRoommates = createAsyncThunk("roommates/fetchRoommates", async (filters = {}) => {
  const query = toQueryString(filters);
  return apiRequest(`/api/roommates${query ? `?${query}` : ""}`);
});

export const createRoommatePost = createAsyncThunk("roommates/createRoommatePost", async (post) => {
  return apiRequest("/api/roommates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
});

const roommatesSlice = createSlice({
  name: "roommates",
  initialState: {
    items: [],
    status: "idle",
    error: "",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoommates.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchRoommates.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchRoommates.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(createRoommatePost.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export default roommatesSlice.reducer;
