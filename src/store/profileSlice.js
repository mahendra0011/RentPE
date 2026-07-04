import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api.js";

export const fetchProfile = createAsyncThunk(
  "profile/fetchProfile",
  async () => {
    return apiRequest("/api/profile");
  },
);

export const updateProfile = createAsyncThunk(
  "profile/updateProfile",
  async (profileData) => {
    return apiRequest("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
  },
);

export const updateNotificationPreferences = createAsyncThunk(
  "profile/updateNotificationPreferences",
  async (preferences) => {
    return apiRequest("/api/profile/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
  },
);

export const updateSearchPreferences = createAsyncThunk(
  "profile/updateSearchPreferences",
  async (preferences) => {
    return apiRequest("/api/profile/search-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
  },
);

export const updateAccountSettings = createAsyncThunk(
  "profile/updateAccountSettings",
  async (settings) => {
    return apiRequest("/api/profile/account-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  },
);

const profileSlice = createSlice({
  name: "profile",
  initialState: {
    profile: null,
    notificationPreferences: {
      newMessages: true,
      bookingUpdates: true,
      promotionalEmails: false,
    },
    searchPreferences: {
      maxPrice: null,
      preferredCities: [],
      roomType: null,
      gender: null,
    },
    accountSettings: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
    },
    status: "idle",
    error: "",
  },
  reducers: {
    clearProfileError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
      state.status = "loading";
      state.error = "";
    })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        const data = action.payload.profile || action.payload;
        state.profile = data;
        if (data.notificationPreferences) {
          state.notificationPreferences = {
            ...state.notificationPreferences,
            ...data.notificationPreferences,
          };
        }
        if (data.searchPreferences) {
          state.searchPreferences = {
            ...state.searchPreferences,
            ...data.searchPreferences,
          };
        }
        if (data.accountSettings) {
          state.accountSettings = {
            ...state.accountSettings,
            ...data.accountSettings,
          };
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(updateProfile.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        const data = action.payload.profile || action.payload;
        state.profile = { ...state.profile, ...data };
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        const prefs = action.payload.notificationPreferences || action.payload;
        state.notificationPreferences = { ...state.notificationPreferences, ...prefs };
      })
      .addCase(updateSearchPreferences.fulfilled, (state, action) => {
        const prefs = action.payload.searchPreferences || action.payload;
        state.searchPreferences = { ...state.searchPreferences, ...prefs };
      })
      .addCase(updateAccountSettings.fulfilled, (state, action) => {
        const settings = action.payload.accountSettings || action.payload;
        state.accountSettings = { ...state.accountSettings, ...settings };
      });
  },
});

export const { clearProfileError } = profileSlice.actions;
export default profileSlice.reducer;
