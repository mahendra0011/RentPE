import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ApiService } from "../services/api";
import { AuthService } from "../services/auth";

export const checkAuth = createAsyncThunk("auth/checkAuth", async () => {
  const token = await AuthService.getToken();
  const user = await AuthService.getUser();
  if (token && user) {
    return { token, user };
  }
  return null;
});

export const login = createAsyncThunk("auth/login", async ({ email, password }) => {
  const data = await ApiService.login(email, password);
  return data;
});

export const register = createAsyncThunk(
  "auth/register",
  async ({ name, email, password, role, phone }) => {
    const data = await ApiService.register(name, email, password, role, phone);
    return data;
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await AuthService.clearAuth();
  return null;
});

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
    },
    clearError(state) {
      state.error = null;
    } },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Invalid email or password.";
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Registration failed.";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  }
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
