import {
  Archive,
  Ban,
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock,
  Edit3,
  File,
  FileText,
  Flag,
  ImagePlus,
  MessageCircle,
  Search,
  SendHorizonal,
  Settings,
  ShieldCheck,
  Smile,
  Trash2,
  X,
} from "lucide-react";
import { Picker, init } from "emoji-mart";
import data from "@emoji-mart/data";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { useChat } from "@/context/ChatContext.jsx";
import { apiRequest } from "@/lib/api.js";
import { formatPrice } from "@/lib/format.js";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const SUSPICIOUS_KEYWORDS = [
  "advance",
  "payment",
  "deposit",
  "booking amount",
  "security deposit",
  "pay first",
  "send money",
  "transfer",
  "UPI",
  "bank account",
  "pay before visit",
  "refundable deposit",
  "registration fee",
  "processing fee",
  "hold amount",
  "token amount",
  "paytm",
  "google pay",
  "phone pe",
  "net banking",
];

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function formatMessageTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

function getOnlineStatus(email, onlineUsers) {
  const status = onlineUsers[email];
  if (!status) return "offline";
  if (status.online) return "online";
  if (status.lastSeen) {
    const diff = Date.now() - new Date(status.lastSeen).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return formatTime(status.lastSeen);
  }
  return "offline";
}

const mediaIcons = {
  pdf: FileText,
  doc: FileText,
  image: ImagePlus,
  file: File,
};

function getMediaIcon(type) {
  return mediaIcons[type] || File;
}

function ConversationItem({ conversation, active, onClick }) {
  const user = useSelector((state) => state.auth.user);
  const { onlineUsers } = useChat();
  const isOwner = conversation.ownerEmail === user?.email;
  const otherEmail = isOwner ? conversation.seekerEmail : conversation.ownerEmail;
  const displayName = conversation.otherUser?.name || otherEmail.split("@")[0];
  const unread = conversation.unreadCount?.[user?.email] || 0;
  const onlineStatus = getOnlineStatus(otherEmail, onlineUsers);
  const isPendingInquiry = conversation.inquiryStatus === "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors hover:bg-slate-50 ${
        active ? "bg-brand-soft/40" : ""
      }`}
    >
      <span className="relative shrink-0">
        <span className="flex size-10 sm:size-11 items-center justify-center rounded-full bg-brand-soft text-xs sm:text-sm font-black text-brand">
          {displayName.charAt(0).toUpperCase()}
        </span>
        {onlineStatus === "online" && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate text-sm font-black text-ink">
            {conversation.muted && <BellOff className="size-3 text-slate-400" />}
            {displayName}
          </span>
          <span className="shrink-0 text-[10px] font-bold text-slate-400">
            {formatTime(conversation.lastMessage?.timestamp)}
          </span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-bold text-slate-500">
            {isPendingInquiry
              ? isOwner
? "📩 Inquiry \u2014 tap to respond"
                : "📩 Inquiry sent \u2014 waiting for owner"
              : conversation.lastMessage?.text || "No messages yet"}
          </span>
          {isPendingInquiry && isOwner && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
              {unread || "!"}
            </span>
          )}
          {!isPendingInquiry && unread > 0 && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
              {unread}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {isPendingInquiry && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
              Inquiry
            </span>
          )}
          <span className="truncate text-[10px] font-bold text-slate-400">
            {conversation.roomTitle}
          </span>
        </span>
      </span>
    </button>
  );
}

function MessageBubble({ message, isOwn }) {
  const user = useSelector((state) => state.auth.user);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [msg, setMsg] = useState(message);
  const editInputRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const MediaIcon = getMediaIcon(msg.mediaType);

  useEffect(() => {
    setMsg(message);
  }, [message]);

  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  const handleReactionClick = (emoji) => {
    onReact(msg._id, emoji.native || emoji);
    setShowReactionPicker(false);
  };

  useEffect(() => {
    if (!showReactionPicker) return;
    function handleClick(e) {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showReactionPicker]);

  useEffect(() => {
    const container = reactionPickerRef.current;
    if (!container || !showReactionPicker) return;

    let picker;
    const initPicker = async () => {
      try {
        await init({ data });
        picker = new Picker({
          ref: { current: container },
          onEmojiSelect: handleReactionClick,
          skinTonePosition: "none",
          previewPosition: "none",
          searchPosition: "sticky",
          perLine: 8,
          maxFrequentRows: 2,
          theme: "light",
          set: "native",
        });
      } catch (e) {
        console.error("Failed to init reaction picker:", e);
      }
    };
    initPicker();
    return () => {
      if (container) container.innerHTML = "";
    };
  }, [showReactionPicker]);

  const formatMessageStatus = () => {
    if (!isOwn) return null;
    if (msg.status === "read") return <CheckCheck className="size-3 text-blue-500" />;
    if (msg.status === "delivered") return <CheckCheck className="size-3" />;
    return <Check className="size-3" />;
  };

  async function handleEdit() {
    if (!editText.trim() || editText === msg.text) {
      setEditing(false);
      return;
    }
    try {
      const data = await apiRequest(`/api/chat/messages/${msg._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      if (data?.message) {
        setMsg((prev) => ({ ...prev, ...data.message, edited: true }));
      }
      setEditing(false);
    } catch (err) {
      alert(err?.message || "Failed to edit message");
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this message?")) return;
    try {
      const data = await apiRequest(`/api/chat/messages/${msg._id}`, { method: "DELETE" });
      if (data?.message) {
        setMsg((prev) => ({ ...prev, ...data.message, deleted: true }));
      } else {
        setMsg((prev) => ({ ...prev, deleted: true }));
      }
    } catch (err) {
      alert(err?.message || "Failed to delete message");
    }
  }

  const onReact = useCallback(async (messageId, emoji) => {
    try {
      const data = await apiRequest(`/api/chat/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (data?.reactions) {
        setMsg((prev) => ({ ...prev, reactions: data.reactions }));
      }
    } catch {
      // ignore
    }
  }, []);

  if (msg.deleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <div className="rounded-2xl border border-dashed border-slate-200 px-3.5 py-2">
          <p className="text-xs italic text-slate-400">This message was deleted</p>
        </div>
      </div>
    );
  }

  const groupedReactions = (msg.reactions || []).reduce((acc, r) => {
    const existing = acc.find((a) => a.emoji === r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(r.userEmail);
    } else {
      acc.push({ emoji: r.emoji, count: 1, users: [r.userEmail] });
    }
    return acc;
  }, []);

  const userReactedEmoji = msg.reactions?.find((r) => r.userEmail === user?.email)?.emoji;

  return (
    <div
      className={`group mb-1 ${isOwn ? "justify-end" : "justify-start"} flex flex-col`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div
          className={`relative max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-3.5 py-2 sm:py-2.5 ${
            isOwn
              ? "rounded-br-md bg-brand text-brand-foreground"
              : "rounded-bl-md bg-slate-100 text-ink"
          }`}
        >
          {msg.mediaUrl && msg.mediaType === "image" && (
            <img
              src={msg.mediaUrl}
              alt="Shared image"
              className="mb-1 max-w-full rounded-lg"
              style={{ maxHeight: 200 }}
            />
          )}
          {msg.mediaUrl && msg.mediaType !== "image" && (
            <a
              href={msg.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-1 flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-bold underline"
            >
              <MediaIcon className="size-4 shrink-0" />
              <span className="truncate">{msg.mediaName || "View file"}</span>
            </a>
          )}
          {msg.text && (
            <p className="text-sm leading-5 break-words">
              {msg.text}
              {msg.edited && !editing && (
                <span className="ml-1 text-[10px] opacity-60">(edited)</span>
              )}
            </p>
          )}
          {editing && (
            <div className="mt-1">
              <input
                ref={editInputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="w-full rounded-lg border border-brand/30 bg-white px-2 py-1 text-sm font-bold text-ink outline-none"
              />
              <div className="mt-1 flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="text-[10px] font-bold text-brand hover:text-brand/80"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          <div
            className={`mt-0.5 flex items-center gap-1 ${isOwn ? "justify-end" : "justify-start"} ${isOwn ? "text-brand-foreground/60" : "text-slate-400"}`}
          >
            {message.flagged && message.flagReason === "Suspicious payment request" && (
              <span
                className="flex items-center gap-0.5 text-[9px] font-bold text-red-500"
                title="Flagged: potential payment scam"
              >
                <Flag className="size-2.5" /> Flagged
              </span>
            )}
            <span className="text-[10px] font-bold">{formatMessageTime(msg.createdAt)}</span>
            {isOwn && formatMessageStatus()}
          </div>

          {groupedReactions.length > 0 && (
            <div
              className={`absolute -bottom-3 flex gap-0.5 ${isOwn ? "right-2" : "left-2"}`}
            >
              {groupedReactions.map((r) => {
                const isActive = r.users?.includes(user?.email);
                return (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onReact(msg._id, r.emoji)}
                    className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs shadow-sm transition-all hover:scale-110 ${
                      isActive
                        ? "border-brand/30 bg-brand-soft text-brand"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <span className="text-sm">{r.emoji}</span>
                    {r.count > 1 && (
                      <span className="text-[10px] font-bold">{r.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div
          className={`relative flex items-center gap-0.5 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}
        >
          {showReactionPicker && (
            <div
              ref={reactionPickerRef}
              className="absolute bottom-full mb-2 z-50 h-[300px] w-[280px]"
            />
          )}
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(msg._id, emoji)}
              className={`flex size-7 items-center justify-center rounded-full text-sm leading-none transition-all hover:scale-125 ${
                userReactedEmoji === emoji
                  ? "bg-brand-soft text-brand ring-1 ring-brand/30"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowReactionPicker((v) => !v)}
            className={`inline-flex size-7 items-center justify-center rounded-full text-xs transition-colors hover:bg-slate-200 ${
              showReactionPicker
                ? "bg-brand-soft text-brand ring-1 ring-brand/30"
                : "text-slate-500"
            }`}
            title="More reactions"
          >
            +
          </button>
          {isOwn && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setEditText(message.text);
                  setShowActions(false);
                }}
                className="rounded-full p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 group-hover:opacity-100"
                title="Edit"
              >
                <Edit3 className="size-3" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
        {formatMessageDate(date)}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-1 flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-3">
        <div className="flex items-center gap-1">
          <span
            className="size-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="size-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="size-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

function ChatWindow({ conversation }) {
  const {
    messages,
    sendMessage,
    typingUsers,
    emitTyping,
    loadMessages,
    setConversations,
    respondToInquiry,
    setActiveConversationId,
    loadConversations,
  } = useChat();
  const user = useSelector((state) => state.auth.user);
  const [text, setText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [editingQuickReply, setEditingQuickReply] = useState(null);
  const [editQuickReplyText, setEditQuickReplyText] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [contextMenu, setContextMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isPrependingRef = useRef(false);
  const conversationMessages = messages[conversation._id] || [];
  const isOwner = conversation.ownerEmail === user?.email;
  const otherEmail = isOwner ? conversation.seekerEmail : conversation.ownerEmail;
  const displayName = conversation.otherUser?.name || otherEmail.split("@")[0];
  const isTyping = typingUsers[conversation._id];
  const { onlineUsers } = useChat();
  const onlineStatus = getOnlineStatus(otherEmail, onlineUsers);
  const { markAsRead } = useChat();

  useEffect(() => {
    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  useEffect(() => {
    markAsRead(conversation._id);
  }, [conversation._id]);

  useEffect(() => {
    apiRequest("/api/chat/quick-replies")
      .then((data) => setQuickReplies(data.quickReplies || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    function handleScroll() {
      if (container.scrollTop < 80 && hasMore && !loadingMore) {
        const prevScrollHeight = container.scrollHeight;
        isPrependingRef.current = true;
        setLoadingMore(true);
        loadMessages(conversation._id, page + 1).then((data) => {
          if (data) {
            setPage((p) => p + 1);
            if (data.page >= data.totalPages) setHasMore(false);
          }
          setLoadingMore(false);
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          });
        });
      }
    }
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [conversation._id, hasMore, loadingMore, loadMessages, page]);

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  // Close emoji-mart picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Initialize emoji-mart Picker
  useEffect(() => {
    const container = emojiPickerRef.current;
    if (!container) return;

    let picker;
    const initializePicker = async () => {
      try {
        await init({ data });
        picker = new Picker({
          ref: { current: container },
          onEmojiSelect: handleEmojiSelect,
          skinTonePosition: "none",
          previewPosition: "none",
          searchPosition: "sticky",
          perLine: 8,
          maxFrequentRows: 2,
          theme: "light",
          set: "native",
        });
      } catch (e) {
        console.error("Failed to initialize emoji-mart:", e);
      }
    };

    initializePicker();

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [showEmojiPicker]);

  async function handleSend(event) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await sendMessage(conversation._id, text);
      setText("");
      localStorage.removeItem(`chatDraft:${conversation._id}`);
      emitTyping(conversation._id, false);
      inputRef.current?.focus();
    } catch {
      // message stays in textbox on failure
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  }

  function handleTyping(value) {
    setText(value);
    emitTyping(conversation._id, value.length > 0);
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const data = await apiRequest("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      if (data.url) {
        await sendMessage(conversation._id, "", data.url, data.mediaType, data.mediaName);
      }
    } catch {
      // ignore
    } finally {
      event.target.value = "";
    }
  }

  async function handleSchedule() {
    if (!scheduleDate || !scheduleTime) return;
    const visitDate = new Date(`${scheduleDate}T${scheduleTime}`);
    const msg = `📅 Visit Request: ${visitDate.toLocaleDateString()} at ${visitDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    await sendMessage(conversation._id, msg);
    setShowSchedule(false);
    setScheduleDate("");
    setScheduleTime("");
  }

  async function handleReport() {
    if (!reportReason.trim()) return;
    try {
      await apiRequest("/api/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation._id, reason: reportReason.trim() }),
      });
      setShowReport(false);
      setReportReason("");
    } catch {
      // ignore
    }
  }

  async function handleBlock() {
    try {
      await apiRequest(`/api/chat/block/${encodeURIComponent(otherEmail)}`, { method: "POST" });
      setContextMenu(false);
    } catch {
      // ignore
    }
  }

  async function handleQuickReply(template) {
    await sendMessage(conversation._id, template);
    setShowQuickReplies(false);
  }

  async function handleAddQuickReply() {
    const newReply = editQuickReplyText.trim();
    if (!newReply) return;
    const updated = [...quickReplies, newReply].slice(0, 10);
    try {
      await apiRequest("/api/chat/quick-replies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickReplies: updated }),
      });
      setQuickReplies(updated);
      setEditQuickReplyText("");
      setEditingQuickReply(null);
    } catch {
      // ignore
    }
  }

  async function handleUpdateQuickReply(index) {
    const updated = quickReplies.map((reply, i) =>
      i === index ? editQuickReplyText.trim() : reply,
    ).filter((r) => r);
    try {
      await apiRequest("/api/chat/quick-replies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickReplies: updated.slice(0, 10) }),
      });
      setQuickReplies(updated.slice(0, 10));
      setEditingQuickReply(null);
      setEditQuickReplyText("");
    } catch {
      // ignore
    }
  }

  async function handleDeleteQuickReply(index) {
    const updated = quickReplies.filter((_, i) => i !== index);
    try {
      await apiRequest("/api/chat/quick-replies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickReplies: updated }),
      });
      setQuickReplies(updated);
    } catch {
      // ignore
    }
  }

  async function handleMute() {
    try {
      const data = await apiRequest(`/api/chat/conversations/${conversation._id}/mute`, {
        method: "PATCH",
      });
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation._id ? { ...c, muted: data.muted } : c)),
      );
      setContextMenu(false);
    } catch {
      // ignore
    }
  }

  async function handleArchive() {
    try {
      const data = await apiRequest(`/api/chat/conversations/${conversation._id}/archive`, {
        method: "PATCH",
      });
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation._id ? { ...c, archived: data.archived } : c)),
      );
      setContextMenu(false);
    } catch {
      // ignore
    }
  }

  let lastDate = "";

  const fileAccept = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx";

  const suspiciousOwnerMessages = conversationMessages.filter(
    (m) =>
      !m.deleted &&
      m.senderEmail !== user?.email &&
      SUSPICIOUS_KEYWORDS.some((kw) => m.text?.toLowerCase().includes(kw)),
  );

  const searchedMessages = chatSearch.trim()
    ? conversationMessages.filter(
        (m) => !m.deleted && m.text?.toLowerCase().includes(chatSearch.trim().toLowerCase()),
      )
    : conversationMessages;

  useEffect(() => {
    const key = `chatDraft:${conversation._id}`;
    const saved = localStorage.getItem(key);
    if (saved && !text) setText(saved);
  }, [conversation._id]);

  useEffect(() => {
    const key = `chatDraft:${conversation._id}`;
    if (text.trim()) {
      localStorage.setItem(key, text);
    } else {
      localStorage.removeItem(key);
    }
  }, [text, conversation._id]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5">
        <span className="relative shrink-0">
          <span className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-brand-soft text-xs sm:text-sm font-black text-brand">
            {displayName.charAt(0).toUpperCase()}
          </span>
          {onlineStatus === "online" && (
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-green-500" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <p className="truncate text-sm font-black text-ink">{displayName}</p>
            {conversation.otherUser?.verified && (
              <ShieldCheck className="size-4 shrink-0 text-blue-500" />
            )}
            {conversation.muted && <BellOff className="size-3 shrink-0 text-slate-400" />}
          </span>
          <p className="truncate text-[10px] font-bold text-slate-400">
            {conversation.inquiryStatus === "pending"
              ? "Inquiry pending"
              : conversation.inquiryStatus === "rejected"
                ? "Inquiry declined"
                : !isOwner && conversation.otherUser?.awayEnabled
                  ? "Away \u2014 auto-reply on"
                  : onlineStatus === "online"
                    ? "Online"
                    : onlineStatus === "offline"
                      ? "Offline"
                      : onlineStatus}
            {!isOwner && conversation.otherUser?.responseTimeMin !== undefined && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-green-700">
                ⚡{conversation.otherUser.responseTimeMin}m
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowChatSearch((v) => !v)}
            className={`inline-flex size-8 items-center justify-center rounded-full transition-colors ${
              showChatSearch ? "bg-brand-soft text-brand" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Search in chat"
          >
            <Search className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setContextMenu((v) => !v)}
            className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {contextMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={handleMute}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {conversation.muted ? (
                  <Bell className="size-3.5" />
                ) : (
                  <BellOff className="size-3.5" />
                )}
                {conversation.muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Archive className="size-3.5" />
                {conversation.archived ? "Unarchive" : "Archive"}
              </button>
              <hr className="my-1 border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete all conversations with ${displayName}? This cannot be undone.`,
                    )
                  ) {
                    apiRequest(`/api/chat/conversations/with/${encodeURIComponent(otherEmail)}`, {
                      method: "DELETE",
                    });
                    setContextMenu(false);
                    setActiveConversationId(null);
                    loadConversations();
                  }
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="size-3.5" /> Delete all chats
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReport(true);
                  setContextMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Flag className="size-3.5 text-amber-500" /> Report
              </button>
              <button
                type="button"
                onClick={handleBlock}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <Ban className="size-3.5" /> Block
              </button>
            </div>
          )}
        </div>
      </div>

      {conversation.roomTitle && (
        <Link
          to={`/rooms/${conversation.roomSlug}`}
          className="flex items-center gap-2 sm:gap-3 border-b border-slate-100 bg-slate-50/80 px-3 sm:px-4 py-1.5 sm:py-2 transition-colors hover:bg-slate-100"
        >
          {conversation.roomImage && (
            <img
              src={conversation.roomImage}
              alt=""
              className="size-8 sm:size-10 shrink-0 rounded-lg bg-slate-200 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] sm:text-xs font-bold text-ink">{conversation.roomTitle}</p>
            {conversation.roomPrice && (
              <p className="text-[10px] font-bold text-brand">
                {formatPrice(conversation.roomPrice)}/mo
              </p>
            )}
          </div>
          <ChevronLeft className="size-3.5 rotate-180 shrink-0 text-slate-400" />
        </Link>
      )}

      {conversation.inquiryStatus === "pending" && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 sm:px-4 py-2 sm:py-3">
          {isOwner ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-xs font-bold text-amber-800">
                📩 Inquiry from <span className="font-black">{displayName}</span> about{" "}
                <span className="font-black">{conversation.roomTitle}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => respondToInquiry(conversation._id, "accept")}
                  className="inline-flex items-center gap-1 rounded-full bg-green-600 px-4 py-1.5 text-xs font-black text-white transition-colors hover:bg-green-700"
                >
                  <Check className="size-3.5" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => respondToInquiry(conversation._id, "reject")}
                  className="inline-flex items-center gap-1 rounded-full bg-red-500 px-4 py-1.5 text-xs font-black text-white transition-colors hover:bg-red-600"
                >
                  <X className="size-3.5" /> Decline
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs font-bold text-amber-700">
              ⏳ Inquiry sent \u2014 waiting for owner to respond
            </p>
          )}
        </div>
      )}

      {conversation.inquiryStatus === "rejected" && (
        <div className="border-b border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 sm:py-3">
          <p className="text-center text-xs font-bold text-slate-500">
            ❌ Inquiry declined by the owner
          </p>
        </div>
      )}

      {conversation.roomAvailable === false && (
        <div className="border-b border-red-200 bg-red-50 px-3 sm:px-4 py-1.5 sm:py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-600">
            <span className="text-sm">🔴</span>
            This property is no longer available \u2014{" "}
            <Link to={`/rooms/${conversation.roomSlug}`} className="underline">
              view listing
            </Link>
          </p>
        </div>
      )}

      <div className="border-b border-amber-100 bg-amber-50/70 px-3 sm:px-4 py-1.5 sm:py-2">
        <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-700">
          <ShieldCheck className="size-3 sm:size-3.5 shrink-0 text-amber-500" />
          Safety tip: Never pay any advance or deposit before visiting the property in person.
        </p>
      </div>

      {suspiciousOwnerMessages.length >= 2 && (
        <div className="border-b border-red-200 bg-red-50 px-3 sm:px-4 py-1.5 sm:py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-600">
            <Flag className="size-3.5 shrink-0 text-red-500" />
            Suspicious pattern detected \u2014 multiple payment requests from this owner. Proceed with
            caution.
          </p>
        </div>
      )}

      {showChatSearch && (
        <div className="border-b border-slate-100 px-3 sm:px-4 py-2">
          <label className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:bg-white">
            <Search className="size-3.5 shrink-0 text-slate-400" />
            <input
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              type="search"
              placeholder="Search in this chat..."
              className="min-w-0 flex-1 bg-transparent text-xs font-bold text-ink outline-none placeholder:text-slate-400"
              autoFocus
            />
            {chatSearch && (
              <button
                type="button"
                onClick={() => setChatSearch("")}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-3" />
              </button>
            )}
          </label>
          {chatSearch.trim() && (
            <p className="mt-1 text-[10px] font-bold text-slate-400">
              {searchedMessages.length} match{searchedMessages.length !== 1 ? "es" : ""}
            </p>
          )}
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-2">
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Clock className="size-4 animate-spin text-slate-400" />
          </div>
        )}
        {searchedMessages.length === 0 && chatSearch.trim() ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-xs font-bold text-slate-400">No messages match "{chatSearch}"</p>
          </div>
        ) : (
          <>
            {searchedMessages.map((msg) => {
              const isOwn = msg.senderEmail === user?.email;
              const msgDate = formatMessageDate(msg.createdAt);
              const showDate = msgDate !== lastDate;
              lastDate = msgDate;
              return (
                <div key={msg._id}>
                  {showDate && <DateSeparator date={msg.createdAt} />}
                  <MessageBubble message={msg} isOwn={isOwn} />
                </div>
              );
            })}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showQuickReplies && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {quickReplies.map((template, i) => (
              <div key={i} className="relative">
                <button
                  type="button"
                  onClick={() => handleQuickReply(template)}
                  className="rounded-full border border-brand/20 bg-white px-3 py-1 text-[11px] font-bold text-brand transition-colors hover:bg-brand-soft"
                >
                  {template}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuickReply(i);
                    setEditQuickReplyText(template);
                  }}
                  className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand text-white"
                  title="Edit quick reply"
                >
                  <Edit3 className="size-2.5" />
                </button>
              </div>
            ))}
            {quickReplies.length < 10 && (
              <button
                type="button"
                onClick={() => {
                  setEditingQuickReply(-1);
                  setEditQuickReplyText("");
                }}
                className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-brand/40 bg-white text-brand"
                title="Add quick reply"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {editingQuickReply !== null && (
        <div className="border-t border-slate-100 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              value={editQuickReplyText}
              onChange={(e) => setEditQuickReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  editingQuickReply >= 0 ? handleUpdateQuickReply(editingQuickReply) : handleAddQuickReply();
                }
                if (e.key === "Escape") {
                  setEditingQuickReply(null);
                  setEditQuickReplyText("");
                }
              }}
              placeholder={editingQuickReply >= 0 ? "Edit quick reply..." : "New quick reply..."}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold outline-none focus:border-brand"
              autoFocus
            />
            <button
              type="button"
              onClick={editingQuickReply >= 0 ? () => handleUpdateQuickReply(editingQuickReply) : handleAddQuickReply}
              disabled={!editQuickReplyText.trim()}
              className="rounded-xl bg-brand px-2.5 py-1.5 text-xs font-black text-brand-foreground disabled:opacity-40"
            >
              Save
            </button>
            {editingQuickReply >= 0 && (
              <button
                type="button"
                onClick={() => handleDeleteQuickReply(editingQuickReply)}
                className="rounded-xl bg-red-500 px-2.5 py-1.5 text-xs font-black text-white"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingQuickReply(null);
                setEditQuickReplyText("");
              }}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-200"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {showSchedule && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-brand"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={handleSchedule}
              disabled={!scheduleDate || !scheduleTime}
              className="rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground disabled:opacity-50"
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-200"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="border-t border-slate-100 bg-rose-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              type="text"
              placeholder="Reason for report..."
              className="flex-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold outline-none focus:border-rose-400"
            />
            <button
              type="button"
              onClick={handleReport}
              disabled={!reportReason.trim()}
              className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-rose-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 z-50">
            <div ref={emojiPickerRef} className="h-[350px] w-[320px] max-h-[50vh] overflow-y-auto" />
          </div>
        )}
        <form onSubmit={handleSend} className="border-t border-slate-200 p-2 sm:p-3">
        {conversation.inquiryStatus === "pending" ? (
          <div className="flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
            <p className="text-xs font-bold text-amber-600">
              {isOwner ? "Accept the inquiry to start chatting" : "Waiting for owner to accept..."}
            </p>
          </div>
        ) : conversation.inquiryStatus === "rejected" ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-400">This conversation was declined</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-brand focus-within:bg-white">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              placeholder="Type a message..."
              className="min-h-11 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200"
              title="Emoji"
            >
              <Smile className="size-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={fileAccept}
              onChange={handleImageUpload}
              className="hidden"
            />
            {quickReplies.length > 0 && (
              <button
                type="button"
                onClick={() => setShowQuickReplies((v) => !v)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200"
                title="Quick replies"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200"
              title="Send file"
            >
              <ImagePlus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule((v) => !v)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200"
              title="Schedule a visit"
            >
              <Calendar className="size-4" />
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-opacity disabled:opacity-40"
            >
              <SendHorizonal className="size-4" />
            </button>
          </div>
        )}
      </form>
      </div>
    </div>
  );
}

function NewChatForm({ room, onBack }) {
  const { sendInquiry } = useChat();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(event) {
    event.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await sendInquiry(room.slug, message);
    } catch (err) {
      setError(err.message || "Failed to start conversation.");
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex size-8 sm:size-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ChevronLeft className="size-4 sm:size-5" />
        </button>
        <span className="text-sm font-black text-ink">New message</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
          <img
            src={room.images?.[0] || ""}
            alt=""
            className="size-14 rounded-xl bg-slate-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-ink">{room.title}</p>
            <p className="text-xs font-bold text-slate-500">
              {room.city} \u2014 {formatPrice(room.price)}/mo
            </p>
          </div>
        </div>
        {error && (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
            {error}
          </p>
        )}
        <form onSubmit={handleStart}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message to the owner..."
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-ink outline-none transition-colors focus:border-brand focus:bg-white placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:bg-brand/90 disabled:cursor-wait disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send message"}
            <SendHorizonal className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatDrawer() {
  const {
    open,
    closeDrawer,
    conversations,
    activeConversationId,
    setActiveConversationId,
    openConversation,
  } = useChat();
  const user = useSelector((state) => state.auth.user);
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showAwaySettings, setShowAwaySettings] = useState(false);
  const { awayMode, updateAwayMode } = useChat();
  const [awayForm, setAwayForm] = useState({ awayEnabled: false, awayMessage: "", awayUntil: "" });
  const drawerRef = useRef(null);

  const activeConversation = conversations.find((c) => c._id === activeConversationId);

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const otherEmail = c.ownerEmail === user?.email ? c.seekerEmail : c.ownerEmail;
    const otherName = c.otherUser?.name || "";
    return (
      otherEmail.toLowerCase().includes(q) ||
      otherName.toLowerCase().includes(q) ||
      c.roomTitle?.toLowerCase().includes(q) ||
      c.lastMessage?.text?.toLowerCase().includes(q)
    );
  });

  const visibleConversations = showArchived
    ? filteredConversations
    : filteredConversations.filter((c) => !c.archived);

  const archivedCount = filteredConversations.filter((c) => c.archived).length;

  useEffect(() => {
    if (awayMode) {
      setAwayForm({
        awayEnabled: awayMode.awayEnabled,
        awayMessage: awayMode.awayMessage || "",
        awayUntil: awayMode.awayUntil || "",
      });
    }
  }, [awayMode]);

  useEffect(() => {
    if (!open) {
      setShowNewChat(false);
      setSearch("");
      setShowArchived(false);
      setShowAwaySettings(false);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target) && open) {
        const chatButton = document.getElementById("chat-drawer-toggle");
        if (chatButton?.contains(event.target)) return;
        closeDrawer();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, closeDrawer]);

  if (!user) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[150] bg-slate-950/25 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none" />
      )}

      <div
        ref={drawerRef}
        className={`fixed bottom-0 right-0 z-[160] flex w-full h-dvh flex-col overflow-hidden bg-white shadow-[0_0_60px_-20px_rgba(15,23,42,0.35)] transition-all duration-300 md:bottom-4 md:right-4 md:h-[680px] md:w-[440px] md:rounded-2xl md:border md:border-slate-200 ${
          open
            ? "translate-y-0 md:translate-y-0 md:opacity-100"
            : "translate-y-full opacity-0 pointer-events-none md:translate-y-4"
        }`}
        style={{ maxHeight: "100dvh" }}
      >
        {showNewChat ? (
          <NewChatForm room={showNewChat} onBack={() => setShowNewChat(false)} />
        ) : activeConversation && activeConversationId ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setActiveConversationId(null);
                }}
                className="inline-flex size-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="text-sm font-black text-ink">Chat</span>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex size-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <ChatWindow key={activeConversation._id} conversation={activeConversation} />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3">
              <span className="text-sm font-black text-ink">Chats</span>
              <div className="flex items-center gap-1">
                {user.role === "owner" && (
                  <button
                    type="button"
                    onClick={() => setShowAwaySettings((v) => !v)}
                    className={`inline-flex size-9 items-center justify-center rounded-full transition-colors ${
                      showAwaySettings
                        ? "bg-brand-soft text-brand"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                    title="Away settings"
                  >
                    <Settings className="size-4" />
                  </button>
                )}
                {archivedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowArchived((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      showArchived
                        ? "bg-brand-soft text-brand"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Archive className="size-3" />
                    {showArchived ? "All" : `${archivedCount} archived`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="inline-flex size-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-100 px-3 sm:px-4 py-2">
              <label className="flex h-9 sm:h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:bg-white">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="search"
                  placeholder="Search chats..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            {showAwaySettings ? (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <h3 className="mb-3 text-xs font-black text-ink">Away / Auto-reply</h3>
                <label className="mb-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={awayForm.awayEnabled}
                    onChange={(e) => setAwayForm((f) => ({ ...f, awayEnabled: e.target.checked }))}
                    className="size-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <span className="text-xs font-bold text-ink">Enable auto-reply</span>
                </label>
                {awayForm.awayEnabled && (
                  <>
                    <label className="mb-1 block text-[10px] font-bold text-slate-500">
                      Auto-reply message
                    </label>
                    <textarea
                      value={awayForm.awayMessage}
                      onChange={(e) => setAwayForm((f) => ({ ...f, awayMessage: e.target.value }))}
                      rows={3}
                      className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-ink outline-none focus:border-brand focus:bg-white"
                    />
                    <label className="mb-1 block text-[10px] font-bold text-slate-500">
                      Until (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={awayForm.awayUntil}
                      onChange={(e) => setAwayForm((f) => ({ ...f, awayUntil: e.target.value }))}
                      className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-ink outline-none focus:border-brand focus:bg-white"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await updateAwayMode({
                      awayEnabled: awayForm.awayEnabled,
                      awayMessage: awayForm.awayMessage,
                      awayUntil: awayForm.awayUntil || null,
                    });
                    setShowAwaySettings(false);
                  }}
                  className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {visibleConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <MessageCircle className="mb-3 size-10 text-slate-300" />
                    <p className="text-sm font-black text-ink">No conversations yet</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {search ? "No matches found." : "Start chatting with room owners."}
                    </p>
                  </div>
                ) : (
                  visibleConversations.map((c) => (
                    <ConversationItem
                      key={c._id}
                      conversation={c}
                      active={c._id === activeConversationId}
                      onClick={() => openConversation(c._id)}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

