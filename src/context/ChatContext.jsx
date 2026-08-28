import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";

import { apiRequest } from "@/lib/api.js";
import { updateFaviconBadge } from "@/lib/favicon.js";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const user = useSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const getToken = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("RentPE:auth"))?.token || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
      setOnlineUsers({});
      setTypingUsers({});
      setConversations([]);
      setUnreadTotal(0);
      setActiveConversationId(null);
      setMessages({});
      return;
    }

    const token = getToken();
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("online:snapshot", (snapshot) => {
      setOnlineUsers(snapshot);
    });

    socket.on("user:online", ({ email, online, lastSeen }) => {
      setOnlineUsers((prev) => ({ ...prev, [email]: { online, lastSeen } }));
    });

    socket.on("message:new", ({ conversationId, message }) => {
      if (message.senderEmail !== user.email) {
        socket.emit("message:delivered", { conversationId, messageIds: [message._id] });
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification("RentPE", {
            body: `${message.text || "Sent a photo"}`,
            icon: "/favicon.ico",
            tag: conversationId,
          });
        }
      }
      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];
        const exists = conversationMessages.some((m) => m._id === message._id);
        if (exists) return prev;
        return { ...prev, [conversationId]: [...conversationMessages, message] };
      });
      loadConversations();
      loadUnreadCount();
    });

    socket.on("message:read", ({ conversationId, readBy }) => {
      setMessages((prev) => {
        const conversationMessages = prev[conversationId];
        if (!conversationMessages) return prev;
        return {
          ...prev,
          [conversationId]: conversationMessages.map((m) =>
            m.senderEmail !== readBy && m.status !== "read"
              ? { ...m, status: "read", read: true }
              : m,
          ),
        };
      });
    });

    socket.on("message:delivered", ({ conversationId, deliveredTo }) => {
      setMessages((prev) => {
        const conversationMessages = prev[conversationId];
        if (!conversationMessages) return prev;
        return {
          ...prev,
          [conversationId]: conversationMessages.map((m) =>
            m.senderEmail !== deliveredTo && m.status === "sent"
              ? { ...m, status: "delivered" }
              : m,
          ),
        };
      });
    });

    socket.on("typing:start", ({ conversationId, email }) => {
      if (email !== user.email) {
        setTypingUsers((prev) => ({ ...prev, [conversationId]: email }));
      }
    });

    socket.on("typing:stop", ({ conversationId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    });

    socket.on("conversation:new", () => {
      loadConversations();
    });

    socket.on("inquiry:responded", ({ conversationId, inquiryStatus }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, inquiryStatus } : c)),
      );
    });

    socket.on("room:status-changed", ({ roomSlug, available }) => {
      setConversations((prev) =>
        prev.map((c) => (c.roomSlug === roomSlug ? { ...c, roomAvailable: available } : c)),
      );
    });

    socket.on("message:edited", ({ messageId, text }) => {
      setMessages((prev) => {
        const next = { ...prev };
        for (const convId of Object.keys(next)) {
          next[convId] = next[convId].map((m) =>
            m._id === messageId ? { ...m, text, edited: true } : m,
          );
        }
        return next;
      });
    });

    socket.on("message:deleted", ({ messageId }) => {
      setMessages((prev) => {
        const next = { ...prev };
        for (const convId of Object.keys(next)) {
          next[convId] = next[convId].map((m) =>
            m._id === messageId ? { ...m, deleted: true } : m,
          );
        }
        return next;
      });
    });

    socket.on("message:reacted", ({ messageId, reactions }) => {
      setMessages((prev) => {
        const next = { ...prev };
        for (const convId of Object.keys(next)) {
          next[convId] = next[convId].map((m) =>
            m._id === messageId ? { ...m, reactions } : m,
          );
        }
        return next;
      });
    });

    socketRef.current = socket;

    loadConversations();
    loadUnreadCount();
    loadAwayMode();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, getToken]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest("/api/chat/conversations");
      setConversations(data.conversations);
    } catch {
      // ignore
    }
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest("/api/chat/unread-count");
      setUnreadTotal(data.totalUnread);
      updateFaviconBadge(data.totalUnread);
    } catch {
      // ignore
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId, page = 1) => {
    if (!conversationId) return null;
    try {
      const data = await apiRequest(
        `/api/chat/conversations/${conversationId}/messages?page=${page}&limit=50`,
      );
      if (page === 1) {
        setMessages((prev) => ({ ...prev, [conversationId]: data.messages }));
        const unreadIds = data.messages
          .filter((m) => m.senderEmail !== user.email && m.status === "sent")
          .map((m) => m._id);
        if (unreadIds.length > 0 && socketRef.current?.connected) {
          socketRef.current.emit("message:delivered", { conversationId, messageIds: unreadIds });
        }
      } else {
        setMessages((prev) => {
          const existing = prev[conversationId] || [];
          const existingIds = new Set(existing.map((m) => m._id));
          const newMessages = data.messages.filter((m) => !existingIds.has(m._id));
          return { ...prev, [conversationId]: [...newMessages, ...existing] };
        });
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    async (conversationId, text, mediaUrl = "", mediaType = "", mediaName = "") => {
      if (!text?.trim() && !mediaUrl) return;
      const data = await apiRequest(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text?.trim() || "", mediaUrl, mediaType, mediaName }),
      });
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), data.message],
      }));
      await loadConversations();
      return data;
    },
    [loadConversations],
  );

  const startConversation = useCallback(
    async (roomSlug, message) => {
      if (!roomSlug || !message.trim() || !user) return null;
      const data = await apiRequest("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomSlug, message: message.trim() }),
      });
      await loadConversations();
      setActiveConversationId(data.conversation._id);
      setOpen(true);
      return data.conversation;
    },
    [user, loadConversations],
  );

  const markAsRead = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        await apiRequest(`/api/chat/conversations/${conversationId}/read`, { method: "PATCH" });
        await loadUnreadCount();
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversationId
              ? { ...c, unreadCount: { ...c.unreadCount, [user.email]: 0 } }
              : c,
          ),
        );
      } catch {
        // ignore
      }
    },
    [user, loadUnreadCount],
  );

  const openConversation = useCallback(
    async (conversationId) => {
      setActiveConversationId(conversationId);
      setOpen(true);
      await loadMessages(conversationId);
      await markAsRead(conversationId);
      if (socketRef.current?.connected) {
        socketRef.current.emit("join:conversation", conversationId);
      }
    },
    [loadMessages, markAsRead],
  );

  const emitTyping = useCallback((conversationId, isTyping) => {
    if (!socketRef.current?.connected || !conversationId) return;
    if (isTyping) {
      socketRef.current.emit("typing:start", { conversationId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing:stop", { conversationId });
      }, 2000);
    } else {
      socketRef.current.emit("typing:stop", { conversationId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  const reactToMessage = useCallback(async (messageId, emoji) => {
    const data = await apiRequest(`/api/chat/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    return data?.reactions || [];
  }, []);

  const respondToInquiry = useCallback(async (conversationId, action) => {
    await apiRequest(`/api/chat/inquiry/${conversationId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversationId
          ? { ...c, inquiryStatus: action === "accept" ? "accepted" : "rejected" }
          : c,
      ),
    );
  }, []);

  const sendInquiry = useCallback(
    async (roomSlug, message) => {
      if (!roomSlug || !message.trim() || !user) return null;
      const data = await apiRequest("/api/chat/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomSlug, message: message.trim() }),
      });
      await loadConversations();
      setActiveConversationId(data.conversation._id);
      setOpen(true);
      return data.conversation;
    },
    [user, loadConversations],
  );

  const getInquiryDailyLimit = useCallback(async () => {
    try {
      const data = await apiRequest("/api/chat/inquiry-daily-limit");
      return data;
    } catch {
      return { remaining: 0, limit: 5 };
    }
  }, []);

  const [awayMode, setAwayMode] = useState({
    awayEnabled: false,
    awayMessage: "",
    awayUntil: null,
  });

  const loadAwayMode = useCallback(async () => {
    if (!user || user.role !== "owner") return;
    try {
      const data = await apiRequest("/api/chat/away-mode");
      setAwayMode(data);
    } catch {
      // ignore
    }
  }, [user]);

  const updateAwayMode = useCallback(async (settings) => {
    try {
      const data = await apiRequest("/api/chat/away-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setAwayMode((prev) => ({ ...prev, ...data }));
    } catch {
      // ignore
    }
  }, []);

  const toggleDrawer = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    loadConversations();
    if (activeConversationId) {
      loadMessages(activeConversationId);
      markAsRead(activeConversationId);
      if (socketRef.current?.connected) {
        socketRef.current.emit("join:conversation", activeConversationId);
      }
    }
  }, [user, open]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [user, loadUnreadCount]);

  useEffect(() => {
    if (!activeConversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("join:conversation", activeConversationId);
    return () => {
      socketRef.current?.emit("leave:conversation", activeConversationId);
    };
  }, [activeConversationId]);

  return (
    <ChatContext.Provider
      value={{
        open,
        conversations,
        activeConversationId,
        messages,
        unreadTotal,
        onlineUsers,
        typingUsers,
        socketConnected,
        messagesEndRef,
        setActiveConversationId,
        loadConversations,
        loadMessages,
        sendMessage,
        startConversation,
        markAsRead,
        openConversation,
        toggleDrawer,
        closeDrawer,
        emitTyping,
        respondToInquiry,
        sendInquiry,
        getInquiryDailyLimit,
        awayMode,
        loadAwayMode,
        updateAwayMode,
        reactToMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
