import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api.js";

const storageKey = "roomradar:auth";

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function saveAuth(auth) {
  localStorage.setItem(storageKey, JSON.stringify(auth));
}

export const requestOtp = createAsyncThunk("auth/requestOtp", async ({ email, isOwner }) => {
  return apiRequest("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, isOwner }),
  });
});

export const verifyOtp = createAsyncThunk("auth/verifyOtp", async ({ email, otp, name }) => {
  return apiRequest("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, name }),
  });
});

const persisted = readAuth();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: persisted.user || null,
    token: persisted.token || "",
    status: "idle",
    error: "",
    devOtp: "",
    otpSent: false,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = "";
      state.otpSent = false;
      state.devOtp = "";
      localStorage.removeItem(storageKey);
    },
    clearAuthError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOtp.pending, (state) => {
        state.status = "loading";
        state.error = "";
        state.devOtp = "";
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.status = "otp-sent";
        state.otpSent = true;
        state.devOtp = action.payload.devOtp || "";
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.otpSent = false;
        state.devOtp = "";
        saveAuth({ user: action.payload.user, token: action.payload.token });
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { clearAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
