import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  savedIds: []
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    toggleSaved(state, action) {
      const id = String(action.payload);
      if (state.savedIds.includes(id)) {
        state.savedIds = state.savedIds.filter((savedId) => savedId !== id);
      } else {
        state.savedIds.push(id);
      }
    },
    clearWishlist(state) {
      state.savedIds = [];
    } }
});

export const { toggleSaved, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
