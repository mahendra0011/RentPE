import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api.js";

export const fetchReviews = createAsyncThunk("reviews/fetchReviews", async (roomSlug) => {
  return apiRequest(`/api/reviews/${roomSlug}`);
});

export const addReview = createAsyncThunk(
  "reviews/addReview",
  async ({ roomSlug, userName, userEmail, rating, comment }) => {
    return apiRequest(`/api/reviews/${roomSlug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, userEmail, rating, comment }),
    });
  },
);

const reviewsSlice = createSlice({
  name: "reviews",
  initialState: {
    byRoom: {}, // { [roomSlug]: Review[] }
    status: "idle",
    error: "",
  },
  reducers: {
    clearReviewsError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.status = "succeeded";
        // The last element of action.meta.arg is the roomSlug we passed
        // action.meta.arg is the roomSlug itself since createAsyncThunk passes the arg directly
        state.byRoom[action.meta.arg] = action.payload;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addReview.fulfilled, (state, action) => {
        const review = action.payload;
        const slug = review.roomSlug;
        if (state.byRoom[slug]) {
          state.byRoom[slug] = [review, ...state.byRoom[slug]];
        } else {
          state.byRoom[slug] = [review];
        }
      });
  },
});

export const { clearReviewsError } = reviewsSlice.actions;
export default reviewsSlice.reducer;