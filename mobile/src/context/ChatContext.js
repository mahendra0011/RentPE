import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { CONFIG } from "../config";
import { AuthService } from "../services/auth";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const user = useSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState({});
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [awayMode, setAwayMode] = useState({ awayEnabled: false, awayMessage: "", awayUntil: null });
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const getToken = useCallback(async () => (await AuthService.getToken()) || "", []);

  const api = useCallback(
    async (path, opts = {}) => {
      const token = await getToken();
      const headers = { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      // Preserve FormData handling: don't set Content-Type if body is FormData
      const res = await fetch(`${CONFIG.API_URL}${path}`, { ...opts, headers });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }
      if (!res.ok) throw new Error(data.message || data.error || "API error");
      return data;
    },
    [getToken],
  );

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const d = await api("/api/chat/conversations");
      setConversations(d.conversations || []);
    } catch {}
  }, [user, api]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const d = await api("/api/chat/unread-count");
      setUnreadTotal(d.totalUnread || 0);
    } catch {}
  }, [user, api]);

  const loadAwayMode = useCallback(async () => {
    if (!user || user.role !== "owner") return;
    try {
      const d = await api("/api/chat/away-mode");
      setAwayMode(d);
    } catch {}
  }, [user, api]);

  const updateAwayMode = useCallback(
    async (settings) => {
      try {
        const d = await api("/api/chat/away-mode", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        setAwayMode((prev) => ({ ...prev, ...d }));
      } catch {}
    },
    [api],
  );

  const loadMessages = useCallback(
    async (conversationId, page = 1) => {
      if (!conversationId) return null;
      try {
        const d = await api(`/api/chat/conversations/${conversationId}/messages?page=${page}&limit=50`);
        if (page === 1) {
          setMessages((prev) => ({ ...prev, [conversationId]: d.messages || [] }));
          const unreadIds = (d.messages || [])
            .filter((m) => m.senderEmail !== user?.email && m.status === "sent")
            .map((m) => m._id);
          if (unreadIds.length > 0 && socketRef.current?.connected) {
            socketRef.current.emit("message:delivered", { conversationId, messageIds: unreadIds });
          }
        } else {
          setMessages((prev) => {
            const existing = prev[conversationId] || [];
            const existingIds = new Set(existing.map((m) => m._id));
            const newMessages = (d.messages || []).filter((m) => !existingIds.has(m._id));
            return { ...prev, [conversationId]: [...newMessages, ...existing] };
          });
        }
        return d;
      } catch {
        return null;
      }
    },
    [api, user],
  );

  const sendMessage = useCallback(
    async (conversationId, text, mediaUrl = "", mediaType = "", mediaName = "") => {
      if (!text?.trim() && !mediaUrl) return;
      const d = await api(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text?.trim() || "", mediaUrl, mediaType, mediaName }),
      });
      setMessages((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] || []), d.message] }));
      loadConversations();
      return d;
    },
    [api, loadConversations],
  );

  const startConversation = useCallback(
    async (roomSlug, message) => {
      if (!roomSlug || !message?.trim() || !user) return null;
      const d = await api("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomSlug, message: message.trim() }),
      });
      await loadConversations();
      setActiveConversationId(d.conversation._id);
      setOpen(true);
      return d.conversation;
    },
    [user, api, loadConversations],
  );

  const markAsRead = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        await api(`/api/chat/conversations/${conversationId}/read`, { method: "PATCH" });
        await loadUnreadCount();
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversationId
              ? { ...c, unreadCount: { ...(c.unreadCount || {}), [user.email]: 0 } }
              : c,
          ),
        );
      } catch {}
    },
    [user, api, loadUnreadCount],
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

  const reactToMessage = useCallback(
    async (messageId, emoji) => {
      const data = await api(`/api/chat/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      return data?.reactions || [];
    },
    [api],
  );

  const respondToInquiry = useCallback(
    async (conversationId, action) => {
      await api(`/api/chat/inquiry/${conversationId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? { ...c, inquiryStatus: action === "accept" ? "accepted" : "rejected" } : c,
        ),
      );
    },
    [api],
  );

  const sendInquiry = useCallback(
    async (roomSlug, message) => {
      if (!roomSlug || !message?.trim() || !user) return null;
      const d = await api("/api/chat/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomSlug, message: message.trim() }),
      });
      await loadConversations();
      setActiveConversationId(d.conversation._id);
      setOpen(true);
      return d.conversation;
    },
    [user, api, loadConversations],
  );

  const getInquiryDailyLimit = useCallback(async () => {
    try {
      const d = await api("/api/chat/inquiry-daily-limit");
      return d;
    } catch {
      return { remaining: 0, limit: 5 };
    }
  }, [api]);

  // Socket lifecycle
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

    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled) return;
      const socket = io(CONFIG.SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));

      socket.on("online:snapshot", (snapshot) => setOnlineUsers(snapshot || {}));

      socket.on("user:online", ({ email, online, lastSeen }) => {
        setOnlineUsers((prev) => ({ ...prev, [email]: { online, lastSeen } }));
      });

      socket.on("message:new", ({ conversationId, message }) => {
        if (message.senderEmail !== user.email) {
          socket.emit("message:delivered", { conversationId, messageIds: [message._id] });
        }
        setMessages((prev) => {
          const arr = prev[conversationId] || [];
          if (arr.some((m) => m._id === message._id)) return prev;
          return { ...prev, [conversationId]: [...arr, message] };
        });
        loadConversations();
        loadUnreadCount();
      });

      socket.on("message:read", ({ conversationId, readBy }) => {
        setMessages((prev) => {
          const msgs = prev[conversationId];
          if (!msgs) return prev;
          return {
            ...prev,
            [conversationId]: msgs.map((m) =>
              m.senderEmail !== readBy && m.status !== "read" ? { ...m, status: "read", read: true } : m,
            ),
          };
        });
      });

      socket.on("message:delivered", ({ conversationId, deliveredTo }) => {
        setMessages((prev) => {
          const msgs = prev[conversationId];
          if (!msgs) return prev;
          return {
            ...prev,
            [conversationId]: msgs.map((m) =>
              m.senderEmail !== deliveredTo && m.status === "sent" ? { ...m, status: "delivered" } : m,
            ),
          };
        });
      });

      socket.on("typing:start", ({ conversationId, email }) => {
        if (email !== user.email) setTypingUsers((prev) => ({ ...prev, [conversationId]: email }));
      });

      socket.on("typing:stop", ({ conversationId }) => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
      });

      socket.on("conversation:new", () => loadConversations());

      socket.on("inquiry:responded", ({ conversationId, inquiryStatus }) => {
        setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, inquiryStatus } : c)));
      });

      socket.on("room:status-changed", ({ roomSlug, available }) => {
        setConversations((prev) => prev.map((c) => (c.roomSlug === roomSlug ? { ...c, roomAvailable: available } : c)));
      });

      socket.on("message:edited", ({ messageId, text }) => {
        setMessages((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            next[k] = next[k].map((m) => (m._id === messageId ? { ...m, text, edited: true } : m));
          }
          return next;
        });
      });

      socket.on("message:deleted", ({ messageId }) => {
        setMessages((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            next[k] = next[k].map((m) => (m._id === messageId ? { ...m, deleted: true } : m));
          }
          return next;
        });
      });

      socket.on("message:reacted", ({ messageId, reactions }) => {
        setMessages((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            next[k] = next[k].map((m) => (m._id === messageId ? { ...m, reactions } : m));
          }
          return next;
        });
      });

      socketRef.current = socket;
      loadConversations();
      loadUnreadCount();
      loadAwayMode();
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, getToken, loadConversations, loadUnreadCount, loadAwayMode]);

  useEffect(() => {
    if (!user || !open) return;
    loadConversations();
    if (activeConversationId) {
      loadMessages(activeConversationId);
      markAsRead(activeConversationId);
      if (socketRef.current?.connected) socketRef.current.emit("join:conversation", activeConversationId);
    }
  }, [user, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const id = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(id);
  }, [user, loadUnreadCount]);

  useEffect(() => {
    if (!activeConversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("join:conversation", activeConversationId);
    return () => {
      socketRef.current?.emit("leave:conversation", activeConversationId);
    };
  }, [activeConversationId]);

  const toggleDrawer = useCallback(() => setOpen((v) => !v), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

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
        awayMode,
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
  const c = useContext(ChatContext);
  if (!c) throw new Error("useChat must be used within ChatProvider");
  return c;
}
