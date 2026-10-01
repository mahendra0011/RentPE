import axios from "axios";
import { CONFIG } from "../config";
import { AuthService } from "./auth";

export const apiClient = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 45000
});

// Request interceptor to attach JWT bearer token
apiClient.interceptors.request.use(async (config) => {
  const token = await AuthService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ApiService = {
  // --- AUTH ---
  async login(email, password, isOwner = false) {
    const response = await apiClient.post("/api/auth/login", { email, password, isOwner });
    const data = response.data;
    if (data?.token) {
      await AuthService.saveAuthData(data.token, data.user);
    }
    return data;
  },

  async loginWithOwner(payload) {
    const response = await apiClient.post("/api/auth/login", payload);
    const data = response.data;
    if (data?.token) {
      await AuthService.saveAuthData(data.token, data.user);
    }
    return data;
  },

  async register(name, email, password, role = "tenant", phone = "") {
    const response = await apiClient.post("/api/auth/register", {
      name,
      email,
      password,
      role,
      phone });
    const data = response.data;
    if (data?.token) {
      await AuthService.saveAuthData(data.token, data.user);
    }
    return data;
  },

  async requestOtp({ email, isOwner, purpose }) {
    const response = await apiClient.post("/api/auth/request-otp", { email, isOwner, purpose });
    return response.data;
  },

  async signupWithOtp({ name, email, mobile, password, isOwner, otp }) {
    const response = await apiClient.post("/api/auth/signup", {
      name,
      email,
      mobile,
      password,
      isOwner,
      otp });
    const data = response.data;
    if (data?.token) {
      await AuthService.saveAuthData(data.token, data.user);
    }
    return data;
  },

  async verifyResetOtp({ email, otp }) {
    const response = await apiClient.post("/api/auth/verify-reset-otp", { email, otp });
    return response.data;
  },

  async resetPassword({ email, resetToken, password }) {
    const response = await apiClient.post("/api/auth/reset-password", {
      email,
      resetToken,
      password });
    return response.data;
  },

  async loginWithGoogle({ credential, isOwner }) {
    const response = await apiClient.post("/api/auth/google", { credential, isOwner });
    const data = response.data;
    if (data?.token) {
      await AuthService.saveAuthData(data.token, data.user);
    }
    return data;
  },

  async getMe() {
    const response = await apiClient.get("/api/auth/me");
    return response.data?.user;
  },

  // --- ROOMS ---
  async getRooms(params = {}) {
    const response = await apiClient.get("/api/rooms", { params });
    return response.data;
  },

  async getRoomDetails(slug) {
    const response = await apiClient.get(`/api/rooms/${slug}`);
    return response.data;
  },

  async getMyListings() {
    try {
      const response = await apiClient.get("/api/rooms/mine");
      return Array.isArray(response.data) ? response.data : (response.data?.rooms || []);
    } catch {
      const fallback = await apiClient.get("/api/rooms?limit=10");
      return fallback.data?.rooms || [];
    }
  },

  async createRoom(formData) {
    const response = await apiClient.post("/api/rooms", formData, {
      headers: { "Content-Type": "multipart/form-data" } });
    return response.data;
  },

  // --- 360 PANORAMA ---
  async uploadPanoramaBatch({ listingId, photos, metadata, onUploadProgress }) {
    const formData = new FormData();
    formData.append("listingId", listingId);
    formData.append("metadata", JSON.stringify(metadata));

    photos.forEach((photo, index) => {
      formData.append("photos", {
        uri: photo.uri,
        name: `pano_tile_${index}_pitch${Math.round(photo.pitch)}_yaw${Math.round(photo.yaw)}.jpg`,
        type: "image/jpeg" });
    });

    const response = await apiClient.post("/api/panorama/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percentCompleted);
        }
      } });

    return response.data;
  },

  async getJobStatus(jobId) {
    const response = await apiClient.get(`/api/panorama/status/${jobId}`);
    return response.data?.job || null;
  },

  async attachDirectUrl(listingId, panoramaUrl) {
    const response = await apiClient.post("/api/panorama/direct-url", {
      listingId,
      panoramaUrl });
    return response.data;
  },

  // --- CHAT ---
  async getConversations() {
    const response = await apiClient.get("/api/chat/conversations");
    return response.data?.conversations || [];
  },

  async getMessages(conversationId) {
    const response = await apiClient.get(`/api/chat/conversations/${conversationId}/messages`);
    return response.data?.messages || [];
  },

  async startConversation(roomId, initialMessage) {
    const response = await apiClient.post("/api/chat/start", {
      roomId,
      message: initialMessage });
    return response.data;
  },

  async sendMessage(conversationId, text) {
    const response = await apiClient.post(`/api/chat/conversations/${conversationId}/messages`, {
      text });
    return response.data?.message;
  },

  // --- REVIEWS ---
  async getReviews(roomSlug) {
    const response = await apiClient.get(`/api/reviews/${encodeURIComponent(roomSlug)}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  async addReview(roomSlug, { rating, comment }) {
    const response = await apiClient.post(`/api/reviews/${encodeURIComponent(roomSlug)}`, {
      rating,
      comment });
    return response.data;
  },

  // --- REPORT ---
  async reportRoom(slug, reason = "User reported possible fake listing") {
    const response = await apiClient.post(`/api/rooms/${encodeURIComponent(slug)}/report`, { reason });
    return response.data;
  },

  async updateRoom(slug, formData) {
    const response = await apiClient.patch(`/api/rooms/${encodeURIComponent(slug)}`, formData, {
      headers: { "Content-Type": "multipart/form-data" } });
    return response.data;
  },

  async deleteRoom(slug) {
    const response = await apiClient.delete(`/api/rooms/${encodeURIComponent(slug)}`);
    return response.data;
  },

  // --- ADMIN (mirrors website apiRequest /api/admin/*) ---
  async getAdminStats() {
    const response = await apiClient.get("/api/admin/stats");
    return response.data;
  },
  async getAdminUsers(params = {}) {
    const response = await apiClient.get("/api/admin/users", { params });
    return response.data;
  },
  async getAdminRooms(params = {}) {
    const response = await apiClient.get("/api/admin/rooms", { params });
    return response.data;
  },
  async getAdminCities() {
    const response = await apiClient.get("/api/admin/cities");
    return response.data;
  },
  async getAdminReports() {
    const response = await apiClient.get("/api/admin/reports");
    return response.data;
  },
  async getAdminFlaggedMessages() {
    try {
      const response = await apiClient.get("/api/admin/flagged-messages");
      return response.data;
    } catch {
      return { messages: [] };
    }
  }
};
