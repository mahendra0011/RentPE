import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import {
  Archive,
  Ban,
  Bell,
  BellOff,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock,
  Edit3,
  Flag,
  ImagePlus,
  MessageCircle,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Trash2,
  X,
} from "lucide-react-native";
import { useChat } from "../context/ChatContext";
import { CONFIG } from "../config";
import { AuthService } from "../services/auth";

// AsyncStorage shim: try real package, fallback to in-memory
let AsyncStorage = null;
try {
  // eslint-disable-next-line global-require
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  AsyncStorage = null;
}
const memoryDrafts = new Map();
async function getDraft(key) {
  try {
    if (AsyncStorage) return (await AsyncStorage.getItem(key)) || "";
    return memoryDrafts.get(key) || "";
  } catch {
    return memoryDrafts.get(key) || "";
  }
}
async function setDraft(key, value) {
  try {
    if (AsyncStorage) {
      if (value) await AsyncStorage.setItem(key, value);
      else await AsyncStorage.removeItem(key);
      return;
    }
    if (value) memoryDrafts.set(key, value);
    else memoryDrafts.delete(key);
  } catch {
    if (value) memoryDrafts.set(key, value);
    else memoryDrafts.delete(key);
  }
}

const EMOJI_LIST = ["👍", "\u2764\uFE0F", "😂", "😮", "😢", "🙏"];
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
  const s = onlineUsers[email];
  if (!s) return "offline";
  if (s.online) return "online";
  if (s.lastSeen) {
    const diff = Date.now() - new Date(s.lastSeen).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return formatTime(s.lastSeen);
  }
  return "offline";
}

function ConversationItem({ conversation, active, onPress }) {
  const user = useSelector((s) => s.auth.user);
  const { onlineUsers } = useChat();
  const isOwner = conversation.ownerEmail === user?.email;
  const otherEmail = isOwner ? conversation.seekerEmail : conversation.ownerEmail;
  const displayName = conversation.otherUser?.name || (otherEmail || "").split("@")[0] || "User";
  const unread = conversation.unreadCount?.[user?.email] || 0;
  const onlineStatus = getOnlineStatus(otherEmail, onlineUsers || {});
  const isPending = conversation.inquiryStatus === "pending";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.convRow, active && styles.convRowActive]}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        {onlineStatus === "online" && <View style={styles.onlineDot} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.convTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
            {conversation.muted ? <BellOff size={10} color="#94a3b8" /> : null}
            <Text style={styles.convName} numberOfLines={1}>{displayName}</Text>
          </View>
          <Text style={styles.convTime}>{formatTime(conversation.lastMessage?.timestamp)}</Text>
        </View>
        <View style={styles.convTopRow}>
          <Text style={styles.convLast} numberOfLines={1}>
            {isPending ? (isOwner ? "📩 Inquiry — tap to respond" : "📩 Inquiry sent — waiting") : conversation.lastMessage?.text || "No messages yet"}
          </Text>
          {isPending && isOwner ? (
            <View style={styles.pendingBadge}><Text style={styles.badgeText}>{unread || "!"}</Text></View>
          ) : unread > 0 ? (
            <View style={styles.unreadBadge}><Text style={styles.badgeText}>{unread}</Text></View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          {isPending && <View style={styles.inquiryTag}><Text style={styles.inquiryTagText}>Inquiry</Text></View>}
          <Text style={styles.convRoom} numberOfLines={1}>{conversation.roomTitle || ""}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MessageBubble({ message, isOwn }) {
  const user = useSelector((s) => s.auth.user);
  const { reactToMessage } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [msg, setMsg] = useState(message);

  useEffect(() => setMsg(message), [message]);
  useEffect(() => { if (editing) setEditText(message.text || ""); }, [editing, message.text]);

  async function onReact(emoji) {
    try {
      const reactions = await reactToMessage(msg._id, emoji);
      setMsg((p) => ({ ...p, reactions }));
    } catch {}
  }
  async function handleEdit() {
    if (!editText.trim() || editText === msg.text) { setEditing(false); return; }
    try {
      const token = await AuthService.getToken();
      const res = await fetch(`${CONFIG.API_URL}/api/chat/messages/${msg._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: editText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed");
      setMsg((p) => ({ ...p, ...(data.message || {}), text: editText.trim(), edited: true }));
      setEditing(false);
    } catch (e) {
      Alert.alert("Edit failed", e.message);
      setEditing(false);
    }
  }
  async function handleDelete() {
    Alert.alert("Delete message?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const token = await AuthService.getToken();
            const res = await fetch(`${CONFIG.API_URL}/api/chat/messages/${msg._id}`, {
              method: "DELETE",
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed");
            setMsg((p) => ({ ...p, ...(data.message || {}), deleted: true }));
          } catch (e) { Alert.alert("Delete failed", e.message); }
        },
      },
    ]);
  }

  if (msg.deleted) {
    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowMe : styles.msgRowOther]}>
        <View style={styles.deletedBubble}><Text style={styles.deletedText}>This message was deleted</Text></View>
      </View>
    );
  }

  const groupedReactions = (msg.reactions || []).reduce((acc, r) => {
    const ex = acc.find((a) => a.emoji === r.emoji);
    if (ex) { ex.count++; ex.users.push(r.userEmail); } else acc.push({ emoji: r.emoji, count: 1, users: [r.userEmail] });
    return acc;
  }, []);
  const userReactedEmoji = msg.reactions?.find((r) => r.userEmail === user?.email)?.emoji;

  return (
    <Pressable onLongPress={() => setShowActions((v) => !v)} style={[styles.msgContainer, isOwn ? styles.msgContainerMe : styles.msgContainerOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleMe : styles.bubbleOther]}>
        {msg.mediaUrl && msg.mediaType === "image" ? (
          <Image source={{ uri: msg.mediaUrl }} style={styles.bubbleImage} resizeMode="cover" />
        ) : null}
        {msg.mediaUrl && msg.mediaType !== "image" ? (
          <TouchableOpacity onPress={() => Alert.alert("File", msg.mediaUrl)}>
            <View style={styles.fileRow}><Text style={[styles.fileText, isOwn && { color: "#fff" }]}>{msg.mediaName || "View file"}</Text></View>
          </TouchableOpacity>
        ) : null}
        {msg.text ? (
          <Text style={[styles.msgText, isOwn ? styles.msgTextMe : styles.msgTextOther]}>
            {msg.text}{msg.edited ? <Text style={styles.editedTag}>  (edited)</Text> : null}
          </Text>
        ) : null}
        {editing ? (
          <View style={{ marginTop: 6 }}>
            <TextInput value={editText} onChangeText={setEditText} style={styles.editInput} autoFocus />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <TouchableOpacity onPress={() => setEditing(false)}><Text style={styles.editCancel}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleEdit}><Text style={styles.editSave}>Save</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}
        <View style={[styles.msgMeta, isOwn ? { justifyContent: "flex-end" } : {}]}>
          {msg.flagged && msg.flagReason === "Suspicious payment request" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Flag size={10} color="#ef4444" /><Text style={{ fontSize: 9, color: "#ef4444", fontWeight: "800" }}>Flagged</Text></View>
          ) : null}
          <Text style={[styles.msgTime, isOwn ? styles.msgTimeMe : styles.msgTimeOther]}>{formatMessageTime(msg.createdAt)}</Text>
          {isOwn ? (msg.status === "read" ? <CheckCheck size={12} color="#3b82f6" /> : msg.status === "delivered" ? <CheckCheck size={12} color="#fff" /> : <Check size={12} color="rgba(255,255,255,0.7)" />) : null}
        </View>
        {groupedReactions.length > 0 && (
          <View style={[styles.reactionsRow, isOwn ? { right: 6 } : { left: 6 }]}>
            {groupedReactions.map((r) => {
              const active = r.users?.includes(user?.email);
              return (
                <TouchableOpacity key={r.emoji} onPress={() => onReact(r.emoji)} style={[styles.reactionChip, active && styles.reactionChipActive]}>
                  <Text style={{ fontSize: 12 }}>{r.emoji}</Text>
                  {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      {showActions && (
        <View style={[styles.msgActions, isOwn ? { justifyContent: "flex-end" } : {}]}>
          {EMOJI_LIST.map((e) => (
            <TouchableOpacity key={e} onPress={() => onReact(e)} style={[styles.emojiBtn, userReactedEmoji === e && styles.emojiBtnActive]}>
              <Text style={{ fontSize: 16 }}>{e}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => Alert.alert("React", "Pick one of the emojis above")} style={styles.emojiMore}><Text style={{ fontWeight: "900", color: "#64748b" }}>+</Text></TouchableOpacity>
          {isOwn && (
            <>
              <TouchableOpacity onPress={() => { setEditing(true); setShowActions(false); }} style={styles.iconBtn}><Edit3 size={14} color="#64748b" /></TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

function DateSeparator({ date }) {
  return (
    <View style={styles.dateSepWrap}><View style={styles.dateSep}><Text style={styles.dateSepText}>{formatMessageDate(date)}</Text></View></View>
  );
}
function TypingIndicator() {
  return (
    <View style={[styles.msgRow, styles.msgRowOther]}><View style={[styles.bubble, styles.bubbleOther, { paddingVertical: 12 }]}><View style={{ flexDirection: "row", gap: 4 }}><View style={styles.typingDot} /><View style={styles.typingDot} /><View style={styles.typingDot} /></View></View></View>
  );
}

function ChatWindow({ conversation, onBack }) {
  const { messages, sendMessage, typingUsers, emitTyping, loadMessages, setConversations, respondToInquiry, setActiveConversationId, loadConversations, markAsRead, onlineUsers } = useChat();
  const user = useSelector((s) => s.auth.user);
  const [text, setText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [editingQR, setEditingQR] = useState(null);
  const [qrText, setQrText] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const flatRef = useRef(null);

  const conversationMessages = messages[conversation._id] || [];
  const isOwner = conversation.ownerEmail === user?.email;
  const otherEmail = isOwner ? conversation.seekerEmail : conversation.ownerEmail;
  const displayName = conversation.otherUser?.name || (otherEmail || "").split("@")[0];
  const isTyping = typingUsers[conversation._id];
  const onlineStatus = getOnlineStatus(otherEmail, onlineUsers || {});

  // draft AsyncStorage
  useEffect(() => {
    getDraft(`chatDraft:${conversation._id}`).then((v) => { if (v) setText(v); });
  }, [conversation._id]);
  useEffect(() => {
    const t = setTimeout(() => setDraft(`chatDraft:${conversation._id}`, text), 400);
    return () => clearTimeout(t);
  }, [text, conversation._id]);

  useEffect(() => { markAsRead(conversation._id); }, [conversation._id]); // eslint-disable-line
  useEffect(() => {
    // quick replies
    (async () => {
      try {
        const token = await AuthService.getToken();
        const res = await fetch(`${CONFIG.API_URL}/api/chat/quick-replies`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const d = await res.json().catch(() => ({}));
        if (res.ok) setQuickReplies(d.quickReplies || []);
      } catch {}
    })();
  }, []);

  const filteredMessages = chatSearch.trim()
    ? conversationMessages.filter((m) => !m.deleted && (m.text || "").toLowerCase().includes(chatSearch.trim().toLowerCase()))
    : conversationMessages;

  const suspiciousCount = conversationMessages.filter((m) => !m.deleted && m.senderEmail !== user?.email && SUSPICIOUS_KEYWORDS.some((kw) => (m.text || "").toLowerCase().includes(kw))).length;

  async function handleSend() {
    if (!text.trim()) return;
    const t = text.trim();
    try {
      await sendMessage(conversation._id, t);
      setText(""); setDraft(`chatDraft:${conversation._id}`, ""); emitTyping(conversation._id, false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) { Alert.alert("Send failed", e.message); }
  }
  function handleTyping(v) { setText(v); emitTyping(conversation._id, v.length > 0); }

  async function handleFilePick() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const token = await AuthService.getToken();
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.fileName || "upload.jpg", type: asset.mimeType || "image/jpeg" });
      const res = await fetch(`${CONFIG.API_URL}/api/chat/upload`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");
      if (data.url) await sendMessage(conversation._id, "", data.url, data.mediaType || "image", data.mediaName || asset.fileName || "");
    } catch (e) { Alert.alert("Upload failed", e.message); }
  }

  async function handleSchedule() {
    if (!scheduleDate || !scheduleTime) { Alert.alert("Missing", "Pick date and time"); return; }
    const visitDate = new Date(`${scheduleDate}T${scheduleTime}`);
    const msg = `📅 Visit Request: ${visitDate.toLocaleDateString()} at ${visitDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    await sendMessage(conversation._id, msg);
    setShowSchedule(false); setScheduleDate(""); setScheduleTime("");
  }
  async function handleReport() {
    if (!reportReason.trim()) return;
    try {
      const token = await AuthService.getToken();
      await fetch(`${CONFIG.API_URL}/api/chat/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ conversationId: conversation._id, reason: reportReason.trim() }),
      });
      setShowReport(false); setReportReason(""); Alert.alert("Reported", "Thanks for reporting");
    } catch {}
  }
  async function handleBlock() {
    try {
      const token = await AuthService.getToken();
      await fetch(`${CONFIG.API_URL}/api/chat/block/${encodeURIComponent(otherEmail)}`, { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      setShowMenu(false); Alert.alert("Blocked", `${displayName} blocked`);
    } catch (e) { Alert.alert("Block failed", e.message); }
  }
  async function handleMute() {
    try {
      const token = await AuthService.getToken();
      const res = await fetch(`${CONFIG.API_URL}/api/chat/conversations/${conversation._id}/mute`, { method: "PATCH", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const d = await res.json().catch(() => ({}));
      setConversations((prev) => prev.map((c) => c._id === conversation._id ? { ...c, muted: d.muted } : c));
      setShowMenu(false);
    } catch {}
  }
  async function handleArchive() {
    try {
      const token = await AuthService.getToken();
      const res = await fetch(`${CONFIG.API_URL}/api/chat/conversations/${conversation._id}/archive`, { method: "PATCH", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const d = await res.json().catch(() => ({}));
      setConversations((prev) => prev.map((c) => c._id === conversation._id ? { ...c, archived: d.archived } : c));
      setShowMenu(false);
    } catch {}
  }
  async function handleAddQR() {
    const v = qrText.trim(); if (!v) return;
    const updated = [...quickReplies, v].slice(0, 10);
    try {
      const token = await AuthService.getToken();
      await fetch(`${CONFIG.API_URL}/api/chat/quick-replies`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ quickReplies: updated }) });
      setQuickReplies(updated); setQrText(""); setEditingQR(null);
    } catch {}
  }
  async function handleUpdateQR(idx) {
    const updated = quickReplies.map((r, i) => (i === idx ? qrText.trim() : r)).filter(Boolean).slice(0, 10);
    try {
      const token = await AuthService.getToken();
      await fetch(`${CONFIG.API_URL}/api/chat/quick-replies`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ quickReplies: updated }) });
      setQuickReplies(updated); setEditingQR(null); setQrText("");
    } catch {}
  }
  async function handleDeleteQR(idx) {
    const updated = quickReplies.filter((_, i) => i !== idx);
    try {
      const token = await AuthService.getToken();
      await fetch(`${CONFIG.API_URL}/api/chat/quick-replies`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ quickReplies: updated }) });
      setQuickReplies(updated);
    } catch {}
  }
  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const data = await loadMessages(conversation._id, page + 1);
    if (data) {
      setPage((p) => p + 1);
      if (data.page >= data.totalPages) setHasMore(false);
    }
    setLoadingMore(false);
  }

  let lastDate = "";
  return (
    <View style={{ flex: 1 }}>
      {/* header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.iconCircle}><ChevronLeft size={18} color="#0f172a" /></TouchableOpacity>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18 }]}><Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
          {onlineStatus === "online" && <View style={[styles.onlineDot, { bottom: 0, right: 0 }]} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
            {conversation.otherUser?.verified ? <ShieldCheck size={12} color="#3b82f6" /> : null}
            {conversation.muted ? <BellOff size={10} color="#94a3b8" /> : null}
          </View>
          <Text style={styles.chatStatus} numberOfLines={1}>
            {conversation.inquiryStatus === "pending" ? "Inquiry pending" : conversation.inquiryStatus === "rejected" ? "Inquiry declined" : onlineStatus === "online" ? "Online" : onlineStatus}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowChatSearch((v) => !v)} style={[styles.iconCircle, showChatSearch && { backgroundColor: "#ede9fe" }]}><Search size={16} color={showChatSearch ? "#7c3aed" : "#64748b"} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMenu((v) => !v)} style={styles.iconCircle}><Text style={{ fontSize: 18, color: "#64748b", fontWeight: "900" }}>⋮</Text></TouchableOpacity>
      </View>
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity style={styles.menuItem} onPress={handleMute}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{conversation.muted ? <Bell size={14} color="#334155" /> : <BellOff size={14} color="#334155" />}<Text style={styles.menuText}>{conversation.muted ? "Unmute" : "Mute"}</Text></View></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleArchive}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Archive size={14} color="#334155" /><Text style={styles.menuText}>{conversation.archived ? "Unarchive" : "Archive"}</Text></View></TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuItem} onPress={handleBlock}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ban size={14} color="#ef4444" /><Text style={[styles.menuText, { color: "#ef4444" }]}>Block {displayName}</Text></View></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowReport(true); setShowMenu(false); }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Flag size={14} color="#f59e0b" /><Text style={styles.menuText}>Report</Text></View></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => {
            Alert.alert("Delete chats", `Delete all chats with ${displayName}?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: async () => {
                const token = await AuthService.getToken();
                await fetch(`${CONFIG.API_URL}/api/chat/conversations/with/${encodeURIComponent(otherEmail)}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                setShowMenu(false); setActiveConversationId(null); loadConversations();
              }},
            ]);
          }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Trash2 size={14} color="#ef4444" /><Text style={[styles.menuText, { color: "#ef4444" }]}>Delete all chats</Text></View></TouchableOpacity>
        </View>
      )}
      {/* room banner */}
      {conversation.roomTitle ? (
        <View style={styles.roomBanner}>
          {conversation.roomImage ? <Image source={{ uri: conversation.roomImage }} style={styles.roomThumb} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.roomTitle} numberOfLines={1}>{conversation.roomTitle}</Text>
            {conversation.roomPrice ? <Text style={styles.roomPrice}>₹{conversation.roomPrice}/mo</Text> : null}
          </View>
        </View>
      ) : null}
      {/* inquiry */}
      {conversation.inquiryStatus === "pending" && (
        <View style={styles.inquiryBanner}>
          {isOwner ? (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={styles.inquiryText}>📩 Inquiry from {displayName} about {conversation.roomTitle}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={() => respondToInquiry(conversation._id, "accept")} style={[styles.pillBtn, { backgroundColor: "#16a34a" }]}><Check size={12} color="#fff" /><Text style={styles.pillBtnText}>Accept</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => respondToInquiry(conversation._id, "reject")} style={[styles.pillBtn, { backgroundColor: "#ef4444" }]}><X size={12} color="#fff" /><Text style={styles.pillBtnText}>Decline</Text></TouchableOpacity>
              </View>
            </View>
          ) : <Text style={styles.inquiryText}>⏳ Inquiry sent — waiting for owner</Text>}
        </View>
      )}
      {conversation.inquiryStatus === "rejected" && <View style={styles.rejectedBanner}><Text style={styles.rejectedText}>❌ Inquiry declined</Text></View>}
      {conversation.roomAvailable === false && <View style={styles.unavailBanner}><Text style={styles.unavailText}>🔴 No longer available</Text></View>}
      <View style={styles.safetyTip}><ShieldCheck size={12} color="#d97706" /><Text style={styles.safetyText}>Never pay advance before visiting in person.</Text></View>
      {suspiciousCount >= 2 && <View style={styles.suspiciousBanner}><Flag size={12} color="#ef4444" /><Text style={styles.suspiciousText}>Suspicious pattern — multiple payment requests. Proceed with caution.</Text></View>}
      {showChatSearch && (
        <View style={styles.searchBar}>
          <Search size={14} color="#94a3b8" />
          <TextInput value={chatSearch} onChangeText={setChatSearch} placeholder="Search in this chat..." placeholderTextColor="#94a3b8" style={styles.searchInput} />
          {chatSearch ? <TouchableOpacity onPress={() => setChatSearch("")}><X size={14} color="#64748b" /></TouchableOpacity> : null}
        </View>
      )}
      {chatSearch.trim() ? <Text style={styles.searchCount}>{filteredMessages.length} match{filteredMessages.length !== 1 ? "es" : ""}</Text> : null}

      {/* messages */}
      <View style={{ flex: 1 }}>
        {hasMore && filteredMessages.length > 0 && !chatSearch.trim() && (
          <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreBtn} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator size="small" color="#7c3aed" /> : <Text style={styles.loadMoreText}>Load earlier messages</Text>}
          </TouchableOpacity>
        )}
        <FlatList
          ref={flatRef}
          data={filteredMessages}
          keyExtractor={(m) => m._id}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          onContentSizeChange={() => { if (!hasMore || page === 1) flatRef.current?.scrollToEnd({ animated: false }); }}
          renderItem={({ item }) => {
            const isOwn = item.senderEmail === user?.email;
            const msgDate = formatMessageDate(item.createdAt);
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;
            return (
              <View>
                {showDate && <DateSeparator date={item.createdAt} />}
                <MessageBubble message={item} isOwn={isOwn} />
              </View>
            );
          }}
          ListEmptyComponent={<View style={{ alignItems: "center", marginTop: 40 }}><MessageCircle size={32} color="#cbd5e1" /><Text style={{ color: "#94a3b8", fontWeight: "800", marginTop: 8 }}>{chatSearch.trim() ? `No matches for "${chatSearch}"` : "No messages yet"}</Text></View>}
        />
        {isTyping && <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}><TypingIndicator /></View>}
      </View>

      {/* quick replies */}
      {showQuickReplies && (
        <View style={styles.qrBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
            {quickReplies.map((t, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity onPress={async () => { await sendMessage(conversation._id, t); setShowQuickReplies(false); }} style={styles.qrChip}><Text style={styles.qrChipText}>{t}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingQR(i); setQrText(t); }} style={styles.qrEditBtn}><Edit3 size={10} color="#fff" /></TouchableOpacity>
              </View>
            ))}
            {quickReplies.length < 10 && <TouchableOpacity onPress={() => { setEditingQR(-1); setQrText(""); }} style={styles.qrAddBtn}><Text style={{ color: "#7c3aed", fontWeight: "900" }}>+</Text></TouchableOpacity>}
          </ScrollView>
        </View>
      )}
      {editingQR !== null && (
        <View style={styles.qrEditBar}>
          <TextInput value={qrText} onChangeText={setQrText} placeholder={editingQR >= 0 ? "Edit quick reply" : "New quick reply"} placeholderTextColor="#94a3b8" style={styles.qrInput} />
          <TouchableOpacity onPress={editingQR >= 0 ? () => handleUpdateQR(editingQR) : handleAddQR} disabled={!qrText.trim()} style={[styles.qrSaveBtn, !qrText.trim() && { opacity: 0.4 }]}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>Save</Text></TouchableOpacity>
          {editingQR >= 0 && <TouchableOpacity onPress={() => handleDeleteQR(editingQR)} style={[styles.qrSaveBtn, { backgroundColor: "#ef4444" }]}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>Delete</Text></TouchableOpacity>}
          <TouchableOpacity onPress={() => { setEditingQR(null); setQrText(""); }} style={styles.qrCloseBtn}><X size={12} color="#64748b" /></TouchableOpacity>
        </View>
      )}
      {showSchedule && (
        <View style={styles.scheduleBar}>
          <TextInput value={scheduleDate} onChangeText={setScheduleDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.scheduleInput} />
          <TextInput value={scheduleTime} onChangeText={setScheduleTime} placeholder="HH:MM" placeholderTextColor="#94a3b8" style={styles.scheduleInput} />
          <TouchableOpacity onPress={handleSchedule} disabled={!scheduleDate || !scheduleTime} style={[styles.scheduleSend, (!scheduleDate || !scheduleTime) && { opacity: 0.5 }]}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>Send</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSchedule(false)} style={styles.qrCloseBtn}><X size={12} color="#64748b" /></TouchableOpacity>
        </View>
      )}
      {showReport && (
        <View style={styles.reportBar}>
          <TextInput value={reportReason} onChangeText={setReportReason} placeholder="Reason for report..." placeholderTextColor="#94a3b8" style={styles.reportInput} />
          <TouchableOpacity onPress={handleReport} disabled={!reportReason.trim()} style={[styles.reportBtn, !reportReason.trim() && { opacity: 0.5 }]}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>Report</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowReport(false)} style={styles.qrCloseBtn}><X size={12} color="#64748b" /></TouchableOpacity>
        </View>
      )}

      {/* emoji picker */}
      {showEmojiPicker && (
        <View style={styles.emojiPicker}>
          <ScrollView contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 8 }}>
            {["😀","😂","\u2764\uFE0F","👍","🙏","😮","😢","🔥","🎉","👏","😊","🥺","🤝","\uD83C\uDFE0","📅","✅","❌","⚡","💬","🙌"].map((e) => (
              <TouchableOpacity key={e} onPress={() => { setText((p) => p + e); setShowEmojiPicker(false); }} style={styles.emojiPickBtn}><Text style={{ fontSize: 22 }}>{e}</Text></TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <View style={styles.inputBar}>
          {conversation.inquiryStatus === "pending" ? (
            <View style={styles.blockedInput}><Text style={styles.blockedText}>{isOwner ? "Accept inquiry to start chatting" : "Waiting for owner to accept..."}</Text></View>
          ) : conversation.inquiryStatus === "rejected" ? (
            <View style={styles.blockedInput}><Text style={styles.blockedText}>This conversation was declined</Text></View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput value={text} onChangeText={handleTyping} placeholder="Type a message..." placeholderTextColor="#94a3b8" style={styles.input} multiline />
              <TouchableOpacity onPress={() => setShowEmojiPicker((v) => !v)} style={styles.inputIcon}><Smile size={18} color={showEmojiPicker ? "#7c3aed" : "#64748b"} /></TouchableOpacity>
              {quickReplies.length > 0 && <TouchableOpacity onPress={() => setShowQuickReplies((v) => !v)} style={styles.inputIcon}><Text style={{ fontSize: 14, color: showQuickReplies ? "#7c3aed" : "#64748b", fontWeight: "900" }}>⚡</Text></TouchableOpacity>}
              <TouchableOpacity onPress={handleFilePick} style={styles.inputIcon}><ImagePlus size={18} color="#64748b" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSchedule((v) => !v)} style={styles.inputIcon}><CalendarIcon size={18} color={showSchedule ? "#7c3aed" : "#64748b"} /></TouchableOpacity>
              <TouchableOpacity onPress={handleSend} disabled={!text.trim()} style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}><Send size={16} color="#fff" /></TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ChatDrawer() {
  const { open, closeDrawer, conversations, activeConversationId, setActiveConversationId, openConversation, unreadTotal } = useChat();
  const user = useSelector((s) => s.auth.user);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showAway, setShowAway] = useState(false);
  const { awayMode, updateAwayMode } = useChat();
  const [awayForm, setAwayForm] = useState({ awayEnabled: false, awayMessage: "", awayUntil: "" });

  useEffect(() => {
    if (awayMode) setAwayForm({ awayEnabled: awayMode.awayEnabled, awayMessage: awayMode.awayMessage || "", awayUntil: awayMode.awayUntil || "" });
  }, [awayMode]);

  useEffect(() => {
    if (!open) { setSearch(""); setShowArchived(false); setShowAway(false); }
  }, [open]);

  const activeConversation = conversations.find((c) => c._id === activeConversationId) || null;
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const otherEmail = c.ownerEmail === user?.email ? c.seekerEmail : c.ownerEmail;
    const otherName = c.otherUser?.name || "";
    return otherEmail.toLowerCase().includes(q) || otherName.toLowerCase().includes(q) || (c.roomTitle || "").toLowerCase().includes(q) || (c.lastMessage?.text || "").toLowerCase().includes(q);
  });
  const visible = showArchived ? filtered : filtered.filter((c) => !c.archived);
  const archivedCount = filtered.filter((c) => c.archived).length;

  if (!user) return null;

  return (
    <>
      {/* Floating badge button when closed — handy for manual open */}
      {!open && unreadTotal > 0 && (
        <TouchableOpacity onPress={() => openConversation(visible[0]?._id)} style={styles.fab} activeOpacity={0.85}>
          <MessageCircle size={20} color="#fff" />
          <View style={styles.fabBadge}><Text style={styles.fabBadgeText}>{unreadTotal > 99 ? "99+" : unreadTotal}</Text></View>
        </TouchableOpacity>
      )}
      <Modal visible={open} animationType="slide" transparent onRequestClose={closeDrawer}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropPress} onPress={closeDrawer} />
          <View style={styles.sheet}>
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
              {/* drag handle */}
              <View style={styles.handle} />
              {activeConversation ? (
                <>
                  <View style={styles.sheetTopBar}>
                    <TouchableOpacity onPress={() => setActiveConversationId(null)} style={styles.iconCircle}><ChevronLeft size={18} color="#0f172a" /></TouchableOpacity>
                    <Text style={styles.sheetTitle}>Chat</Text>
                    <TouchableOpacity onPress={closeDrawer} style={styles.iconCircle}><X size={16} color="#0f172a" /></TouchableOpacity>
                  </View>
                  <ChatWindow conversation={activeConversation} onBack={() => setActiveConversationId(null)} />
                </>
              ) : (
                <>
                  <View style={styles.sheetTopBar}>
                    <Text style={styles.sheetTitle}>Chats {unreadTotal > 0 ? `• ${unreadTotal} unread` : ""}</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      {user.role === "owner" && (
                        <TouchableOpacity onPress={() => setShowAway((v) => !v)} style={[styles.iconCircle, showAway && { backgroundColor: "#ede9fe" }]}>
                          <Settings size={16} color={showAway ? "#7c3aed" : "#64748b"} />
                        </TouchableOpacity>
                      )}
                      {archivedCount > 0 && (
                        <TouchableOpacity onPress={() => setShowArchived((v) => !v)} style={[styles.archivedPill, showArchived && { backgroundColor: "#ede9fe" }]}>
                          <Archive size={12} color={showArchived ? "#7c3aed" : "#64748b"} /><Text style={[styles.archivedText, showArchived && { color: "#7c3aed" }]}>{showArchived ? "All" : `${archivedCount} archived`}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={closeDrawer} style={styles.iconCircle}><X size={16} color="#0f172a" /></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.searchBar}>
                    <Search size={14} color="#94a3b8" />
                    <TextInput value={search} onChangeText={setSearch} placeholder="Search chats..." placeholderTextColor="#94a3b8" style={styles.searchInput} />
                  </View>
                  {showAway ? (
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                      <Text style={styles.awayTitle}>Away / Auto-reply</Text>
                      <TouchableOpacity onPress={() => setAwayForm((f) => ({ ...f, awayEnabled: !f.awayEnabled }))} style={styles.checkRow}>
                        <View style={[styles.checkbox, awayForm.awayEnabled && styles.checkboxOn]}>{awayForm.awayEnabled ? <Check size={12} color="#fff" /> : null}</View>
                        <Text style={styles.checkLabel}>Enable auto-reply</Text>
                      </TouchableOpacity>
                      {awayForm.awayEnabled && (
                        <>
                          <Text style={styles.fieldLabel}>Auto-reply message</Text>
                          <TextInput value={awayForm.awayMessage} onChangeText={(v) => setAwayForm((f) => ({ ...f, awayMessage: v }))} multiline style={styles.awayInput} placeholder="I'm away..." placeholderTextColor="#94a3b8" />
                          <Text style={styles.fieldLabel}>Until (optional)</Text>
                          <TextInput value={awayForm.awayUntil} onChangeText={(v) => setAwayForm((f) => ({ ...f, awayUntil: v }))} style={styles.awayInput} placeholder="2026-09-10T18:00" placeholderTextColor="#94a3b8" />
                        </>
                      )}
                      <TouchableOpacity onPress={async () => { await updateAwayMode({ awayEnabled: awayForm.awayEnabled, awayMessage: awayForm.awayMessage, awayUntil: awayForm.awayUntil || null }); setShowAway(false); }} style={styles.saveBtn}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
                    </ScrollView>
                  ) : (
                    <FlatList
                      data={visible}
                      keyExtractor={(c) => c._id}
                      contentContainerStyle={{ padding: 8 }}
                      ListEmptyComponent={<View style={styles.emptyWrap}><MessageCircle size={40} color="#cbd5e1" /><Text style={styles.emptyTitle}>No conversations yet</Text><Text style={styles.emptySub}>{search ? "No matches found." : "Start chatting with room owners."}</Text></View>}
                      renderItem={({ item }) => <ConversationItem conversation={item} active={item._id === activeConversationId} onPress={() => openConversation(item._id)} />}
                    />
                  )}
                </>
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  backdropPress: { flex: 1 },
  sheet: { height: "92%", backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0", alignSelf: "center", marginTop: 8, marginBottom: 4 },
  sheetTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#e2e8f0", gap: 8 },
  sheetTitle: { fontSize: 14, fontWeight: "900", color: "#0f172a", flex: 1 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  convRow: { flexDirection: "row", gap: 12, padding: 12, borderBottomWidth: 1, borderColor: "#f1f5f9", backgroundColor: "#fff" },
  convRowActive: { backgroundColor: "#ede9fe" },
  avatarWrap: { position: "relative" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "900", color: "#7c3aed", fontSize: 14 },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#fff" },
  convTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "center" },
  convName: { fontSize: 13, fontWeight: "900", color: "#0f172a", flexShrink: 1 },
  convTime: { fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  convLast: { fontSize: 12, fontWeight: "600", color: "#64748b", flex: 1 },
  convRoom: { fontSize: 10, fontWeight: "700", color: "#94a3b8", flex: 1 },
  unreadBadge: { backgroundColor: "#7c3aed", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center" },
  pendingBadge: { backgroundColor: "#f59e0b", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  inquiryTag: { backgroundColor: "#fef3c7", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  inquiryTagText: { fontSize: 9, fontWeight: "900", color: "#b45309", textTransform: "uppercase" },
  fab: { position: "absolute", bottom: 90, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, zIndex: 50 },
  fabBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#ef4444", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  fabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, paddingHorizontal: 12, height: 40, borderRadius: 20, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "700", color: "#0f172a" },
  searchCount: { fontSize: 10, fontWeight: "700", color: "#94a3b8", paddingHorizontal: 16, marginBottom: 4 },
  archivedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  archivedText: { fontSize: 10, fontWeight: "800", color: "#64748b" },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  emptySub: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  awayTitle: { fontSize: 12, fontWeight: "900", color: "#0f172a", marginBottom: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  checkLabel: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: "#64748b", marginBottom: 4, marginTop: 8 },
  awayInput: { borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontWeight: "600", color: "#0f172a", minHeight: 44 },
  saveBtn: { marginTop: 16, backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#e2e8f0" },
  chatName: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  chatStatus: { fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  menuDropdown: { position: "absolute", top: 52, right: 12, width: 200, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingVertical: 6, elevation: 8, zIndex: 20 },
  menuItem: { paddingHorizontal: 14, paddingVertical: 10 },
  menuText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  menuSep: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 4 },
  roomBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  roomThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#e2e8f0" },
  roomTitle: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  roomPrice: { fontSize: 10, fontWeight: "800", color: "#7c3aed" },
  inquiryBanner: { backgroundColor: "#fef3c7", borderBottomWidth: 1, borderColor: "#fde68a", padding: 12, alignItems: "center" },
  inquiryText: { fontSize: 11, fontWeight: "800", color: "#92400e", textAlign: "center" },
  pillBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pillBtnText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  rejectedBanner: { backgroundColor: "#f8fafc", borderBottomWidth: 1, borderColor: "#e2e8f0", padding: 10, alignItems: "center" },
  rejectedText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  unavailBanner: { backgroundColor: "#fef2f2", borderBottomWidth: 1, borderColor: "#fecaca", padding: 8, alignItems: "center" },
  unavailText: { fontSize: 11, fontWeight: "700", color: "#dc2626" },
  safetyTip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fffbeb", borderBottomWidth: 1, borderColor: "#fde68a" },
  safetyText: { fontSize: 10, fontWeight: "700", color: "#92400e", flex: 1 },
  suspiciousBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fef2f2", borderBottomWidth: 1, borderColor: "#fecaca" },
  suspiciousText: { fontSize: 10, fontWeight: "700", color: "#dc2626", flex: 1 },
  dateSepWrap: { alignItems: "center", paddingVertical: 8 },
  dateSep: { backgroundColor: "#f1f5f9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  dateSepText: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  msgContainer: { marginBottom: 4 },
  msgContainerMe: { alignItems: "flex-end" },
  msgContainerOther: { alignItems: "flex-start" },
  msgRow: { flexDirection: "row", marginBottom: 2 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: "#7c3aed", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#f1f5f9", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  bubbleImage: { width: 180, height: 180, borderRadius: 8, marginBottom: 4 },
  msgText: { fontSize: 13, lineHeight: 18 },
  msgTextMe: { color: "#fff", fontWeight: "600" },
  msgTextOther: { color: "#0f172a" },
  editedTag: { fontSize: 9, opacity: 0.7 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  msgTime: { fontSize: 9, fontWeight: "700" },
  msgTimeMe: { color: "rgba(255,255,255,0.75)" },
  msgTimeOther: { color: "#94a3b8" },
  deletedBubble: { borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "dashed", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  deletedText: { fontSize: 11, fontStyle: "italic", color: "#94a3b8" },
  reactionsRow: { position: "absolute", bottom: -10, flexDirection: "row", gap: 4 },
  reactionChip: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2 },
  reactionChipActive: { borderColor: "#ddd6fe", backgroundColor: "#ede9fe" },
  reactionCount: { fontSize: 10, fontWeight: "800", color: "#7c3aed" },
  msgActions: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" },
  emojiBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  emojiBtnActive: { backgroundColor: "#ede9fe", borderColor: "#c4b5fd" },
  emojiMore: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  iconBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#94a3b8" },
  fileRow: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 2 },
  fileText: { fontSize: 11, fontWeight: "800", color: "#0f172a" },
  editInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#c4b5fd", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, fontWeight: "600", color: "#0f172a" },
  editCancel: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  editSave: { fontSize: 11, fontWeight: "800", color: "#7c3aed" },
  loadMoreBtn: { alignItems: "center", paddingVertical: 8 },
  loadMoreText: { fontSize: 11, fontWeight: "700", color: "#7c3aed" },
  qrBar: { borderTopWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc", paddingVertical: 8 },
  qrChip: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd6fe", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  qrChipText: { fontSize: 11, fontWeight: "700", color: "#7c3aed" },
  qrEditBtn: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" },
  qrAddBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#c4b5fd", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  qrEditBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  qrInput: { flex: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontWeight: "600", color: "#0f172a" },
  qrSaveBtn: { backgroundColor: "#7c3aed", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  qrCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" },
  scheduleBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  scheduleInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontWeight: "600", color: "#0f172a" },
  scheduleSend: { backgroundColor: "#7c3aed", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  reportBar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  reportInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontWeight: "600", color: "#0f172a" },
  reportBtn: { backgroundColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  emojiPicker: { borderTopWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", maxHeight: 160 },
  emojiPickBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#f8fafc" },
  inputBar: { borderTopWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  input: { flex: 1, fontSize: 13, fontWeight: "600", color: "#0f172a", maxHeight: 80, paddingVertical: 6, paddingHorizontal: 8 },
  inputIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#cbd5e1" },
  blockedInput: { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a", borderRadius: 16, paddingVertical: 10, alignItems: "center" },
  blockedText: { fontSize: 11, fontWeight: "700", color: "#92400e" },
});
