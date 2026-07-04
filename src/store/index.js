import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/store/authSlice.js";
import reviewsReducer from "@/store/reviewsSlice.js";
import roomsReducer from "@/store/roomsSlice.js";
import messagesReducer from "@/store/messagesSlice.js";
import bookingReducer from "@/store/bookingSlice.js";
import notificationsReducer from "@/store/notificationsSlice.js";
import profileReducer from "@/store/profileSlice.js";
import mapReducer from "@/store/mapSlice.js";
import uiReducer from "@/store/uiSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rooms: roomsReducer,
    reviews: reviewsReducer,
    messages: messagesReducer,
    booking: bookingReducer,
    notifications: notificationsReducer,
    profile: profileReducer,
    map: mapReducer,
    ui: uiReducer,
  },
});
