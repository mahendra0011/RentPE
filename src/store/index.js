import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/authSlice.js";
import roomsReducer from "@/store/roomsSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomsReducer,
  },
});
