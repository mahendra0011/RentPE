import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api.js";

export const fetchConversations = createAsyncThunk(
  "messages/fetchConversations",
  async () => {
    const data = await apiRequest("/api/chat/conversations");
    return data.conversations;
  },
);

export const fetchUnreadCount = createAsyncThunk(
  "messages/fetchUnreadCount",
  async () => {
    const data = await apiRequest("/api/chat/unread-count");
    return data.totalUnread;
  },
);

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (conversationId) => {
    const data = await apiRequest(`/api/chat/conversations/${conversationId}/messages`);
    return { conversationId, messages: data.messages };
  },
);

export const sendMessage = createAsyncThunk(
  "messages/sendMessage",
  async ({ conversationId, text }) => {
    const data = await apiRequest(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    return { conversationId, message: data.message };
  },
);

export const startConversation = createAsyncThunk(
  "messages/startConversation",
  async ({ roomSlug, message }) => {
    const data = await apiRequest("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomSlug, message: message.trim() }),
    });
    return data.conversation;
  },
);

export const markAsRead = createAsyncThunk(
  "messages/markAsRead",
  async (conversationId) => {
    await apiRequest(`/api/chat/conversations/${conversationId}/read`, { method: "PATCH" });
    return conversationId;
  },
);

const messagesSlice = createSlice({
  name: "messages",
  initialState: {
    conversations: [],
    messages: {},
    activeConversationId: null,
    unreadTotal: 0,
    drawerOpen: false,
    status: "idle",
    error: "",
  },
  reducers: {
    toggleDrawer(state) {
      state.drawerOpen = !state.drawerOpen;
    },
    closeDrawer(state) {
      state.drawerOpen = false;
    },
    setActiveConversationId(state, action) {
      state.activeConversationId = action.payload;
    },
    clearMessagesError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadTotal = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        state.messages[conversationId] = messages;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { conversationId, message } = action.payload;
        if (state.messages[conversationId]) {
          state.messages[conversationId] = [...state.messages[conversationId], message];
        } else {
          state.messages[conversationId] = [message];
        }
      })
      .addCase(startConversation.fulfilled, (state, action) => {
        const exists = state.conversations.some((c) => c._id === action.payload._id);
        if (!exists) {
          state.conversations.push(action.payload);
        }
        state.activeConversationId = action.payload._id;
        state.drawerOpen = true;
      });
  },
});

export const { clearMessagesError, closeDrawer, setActiveConversationId, toggleDrawer } = messagesSlice.actions;
export default messagesSlice.reducer;
