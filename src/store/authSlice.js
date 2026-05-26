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

export const requestOtp = createAsyncThunk(
  "auth/requestOtp",
  async ({ email, isOwner, purpose = "login" }) => {
    return apiRequest("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, isOwner, purpose }),
    });
  },
);

export const verifyOtp = createAsyncThunk("auth/verifyOtp", async ({ email, otp, name }) => {
  return apiRequest("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, name }),
  });
});

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async ({ name, email, mobile, password, isOwner, otp }) => {
    return apiRequest("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, mobile, password, isOwner, otp }),
    });
  },
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password, isOwner }) => {
    return apiRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, isOwner }),
    });
  },
);

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
      })
      .addCase(signupUser.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.otpSent = false;
        state.devOtp = "";
        saveAuth({ user: action.payload.user, token: action.payload.token });
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.otpSent = false;
        state.devOtp = "";
        saveAuth({ user: action.payload.user, token: action.payload.token });
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { clearAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
