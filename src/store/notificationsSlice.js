import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api.js";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async () => {
    return apiRequest("/api/notifications");
  },
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markNotificationRead",
  async (notificationId) => {
    return apiRequest(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllNotificationsRead",
  async () => {
    return apiRequest("/api/notifications/read-all", { method: "PATCH" });
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    unreadCount: 0,
    status: "idle",
    error: "",
  },
  reducers: {
    clearNotificationError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.notifications = action.payload.notifications || action.payload;
        state.unreadCount = action.payload.unreadCount ||
          (action.payload.notifications || []).filter((n) => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const id = action.meta.arg;
        const notification = state.notifications.find(
          (n) => (n._id || n.id) === id,
        );
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => { n.read = true; });
        state.unreadCount = 0;
      });
  },
});

export const { clearNotificationError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
