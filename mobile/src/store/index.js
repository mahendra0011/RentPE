import { configureStore } from "@reduxjs/toolkit";
import roomsReducer from "./roomsSlice";
import authReducer from "./authSlice";
import wishlistReducer from "./wishlistSlice";

export const store = configureStore({
  reducer: {
    rooms: roomsReducer,
    auth: authReducer,
    wishlist: wishlistReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false })
});
