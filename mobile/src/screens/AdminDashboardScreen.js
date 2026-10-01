import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useSelector, useDispatch } from "react-redux";
import { ApiService, apiClient } from "../services/api";
import { COLORS } from "../theme";
import { LayoutDashboard, Users, Home, Globe, AlertTriangle, ShieldCheck, Search, MapPin, MessageCircle } from "lucide-react-native";
import { logout as logoutAction } from "../store/authSlice";
import { formatPrice } from "../lib/format";

const tabs = [
  { id: "overview", label: "Overview", icon: "" },
  { id: "users", label: "Users", icon: "" },
  { id: "rooms", label: "Rooms", icon: "" },
  { id: "cities", label: "Cities", icon: "" },
  { id: "reports", label: "Reports", icon: "" },
  { id: "flagged", label: "Flagged Msgs", icon: "" },
];

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name) {
  const colors = ["#ede9fe", "#ecfdf5", "#fef3c7", "#ffe4e6", "#dbeafe", "#f3e8ff", "#cffafe"];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Generic apiRequest wrapper for /api/admin/* parity with website
async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = options.headers || {};
  const body = options.body;
  const res = await apiClient.request({
    url: path,
    method,
    headers,
    data: body ? (typeof body === "string" ? JSON.parse(body) : body) : undefined,
  });
  return res.data;
}

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    brand: { bg: COLORS.brandSoft, fg: COLORS.brand },
    green: { bg: "#ecfdf5", fg: "#059669" },
    amber: { bg: "#fffbeb", fg: "#d97706" },
    rose: { bg: "#fff1f2", fg: "#e11d48" },
    blue: { bg: "#eff6ff", fg: "#2563eb" },
    purple: { bg: "#f5f3ff", fg: "#7c3aed" },
    cyan: { bg: "#ecfeff", fg: "#0891b2" },
  };
  const c = colorMap[color] || colorMap.brand;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {String(value ?? "—")}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }) {
  const bg = status === "live" || status === "available" ? "#ecfdf5" : status === "reported" ? "#fff1f2" : "#f1f5f9";
  const fg = status === "live" || status === "available" ? "#059669" : status === "reported" ? "#e11d48" : "#64748b";
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: fg + "30" }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{String(status || "—").toUpperCase()}</Text>
    </View>
  );
}

function RoleBadge({ role }) {
  const map = {
    admin: { bg: "#f5f3ff", fg: "#7c3aed" },
    owner: { bg: "#eff6ff", fg: "#2563eb" },
    seeker: { bg: "#f1f5f9", fg: "#64748b" },
  };
  const c = map[role] || map.seeker;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.fg + "30" }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{String(role || "seeker").toUpperCase()}</Text>
    </View>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.pageBtn, page <= 1 && { opacity: 0.4 }]}
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      >
        <Text style={styles.pageBtnText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.pageLabel}>
        Page {page} of {totalPages}
      </Text>
      <TouchableOpacity
        style={[styles.pageBtn, page >= totalPages && { opacity: 0.4 }]}
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
      >
        <Text style={styles.pageBtnText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>{message}</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");

  const [rooms, setRooms] = useState([]);
  const [roomsTotal, setRoomsTotal] = useState(0);
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsTotalPages, setRoomsTotalPages] = useState(1);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("");

  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");
  const [addingCity, setAddingCity] = useState(false);

  const [reports, setReports] = useState([]);
  const [flaggedMessages, setFlaggedMessages] = useState([]);

  const [confirm, setConfirm] = useState(null);
  const [changingRole, setChangingRole] = useState(null);
  const [changingStatus, setChangingStatus] = useState(null);
  const [verifyingSlug, setVerifyingSlug] = useState(null);

  const userSearchTimer = useRef(null);
  const roomSearchTimer = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "users") return;
    loadUsers();
  }, [isAdmin, activeTab, usersPage, userSearch]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "rooms") return;
    loadRooms();
  }, [isAdmin, activeTab, roomsPage, roomSearch, roomStatusFilter]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "reports") return;
    loadReports();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "cities") return;
    loadCities();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "flagged") return;
    loadFlaggedMessages();
  }, [isAdmin, activeTab]);

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/admin/stats");
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const params = new URLSearchParams({ page: String(usersPage), limit: "20" });
      if (userSearch.trim()) params.set("search", userSearch.trim());
      const data = await apiRequest(`/api/admin/users?${params}`);
      setUsers(data.users || data.data || []);
      setUsersTotal(data.total || 0);
      setUsersTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    }
  }

  async function loadRooms() {
    try {
      const params = new URLSearchParams({ page: String(roomsPage), limit: "20" });
      if (roomSearch.trim()) params.set("search", roomSearch.trim());
      if (roomStatusFilter) params.set("status", roomStatusFilter);
      const data = await apiRequest(`/api/admin/rooms?${params}`);
      setRooms(data.rooms || data.data || []);
      setRoomsTotal(data.total || 0);
      setRoomsTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to load rooms.");
    }
  }

  async function loadReports() {
    try {
      const data = await apiRequest("/api/admin/reports");
      setReports(data.rooms || data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    }
  }

  async function loadCities() {
    setCitiesLoading(true);
    try {
      const data = await apiRequest("/api/admin/cities");
      setCities(Array.isArray(data) ? data : data.cities || []);
    } catch (err) {
      setError(err.message || "Failed to load cities.");
    } finally {
      setCitiesLoading(false);
    }
  }

  async function handleAddCity() {
    const name = newCityName.trim();
    if (!name) return;
    setAddingCity(true);
    setError("");
    try {
      await apiRequest("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, state: newCityState.trim() }),
      });
      setNewCityName("");
      setNewCityState("");
      await loadCities();
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to add city.");
    } finally {
      setAddingCity(false);
    }
  }

  async function handleDeleteCity(name) {
    setConfirm(null);
    try {
      await apiRequest(`/api/admin/cities/${encodeURIComponent(name)}`, { method: "DELETE" });
      await loadCities();
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to delete city.");
    }
  }

  async function loadFlaggedMessages() {
    try {
      const data = await apiRequest("/api/admin/flagged-messages");
      setFlaggedMessages(data.messages || []);
    } catch (err) {
      setError(err.message || "Failed to load flagged messages.");
    }
  }

  function handleUserSearch(value) {
    setUserSearch(value);
    clearTimeout(userSearchTimer.current);
    userSearchTimer.current = setTimeout(() => setUsersPage(1), 400);
  }

  function handleRoomSearch(value) {
    setRoomSearch(value);
    clearTimeout(roomSearchTimer.current);
    roomSearchTimer.current = setTimeout(() => setRoomsPage(1), 400);
  }

  async function handleRoleChange(email, newRole) {
    setChangingRole(email);
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(email)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      await loadUsers();
    } catch (err) {
      setError(err.message || "Failed to update role.");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleDeleteUser(email) {
    setConfirm(null);
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" });
      await loadUsers();
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to delete user.");
    }
  }

  async function handleStatusChange(slug, newStatus) {
    setChangingStatus(slug);
    try {
      await apiRequest(`/api/admin/rooms/${encodeURIComponent(slug)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setChangingStatus(null);
    }
  }

  async function handleDeleteRoom(slug) {
    setConfirm(null);
    try {
      await apiRequest(`/api/admin/rooms/${encodeURIComponent(slug)}`, { method: "DELETE" });
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError(err.message || "Failed to delete room.");
    }
  }

  async function handleVerify(slug) {
    setVerifyingSlug(slug);
    try {
      await apiRequest(`/api/admin/rooms/${encodeURIComponent(slug)}/verify`, { method: "PATCH" });
      await loadRooms();
    } catch (err) {
      setError(err.message || "Failed to verify owner.");
    } finally {
      setVerifyingSlug(null);
    }
  }

  function handleLogout() {
    dispatch(logoutAction());
    navigation?.navigate?.("MainTabs");
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar style="dark" />
        <Text style={styles.guardIcon}></Text>
        <Text style={styles.guardTitle}>Login required</Text>
        <TouchableOpacity style={styles.guardBtn} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.guardBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar style="dark" />
        <Text style={styles.guardIcon}></Text>
        <Text style={styles.guardTitle}>Access denied</Text>
        <Text style={styles.guardSub}>Admin privileges required.</Text>
        <TouchableOpacity style={styles.guardBtn} onPress={() => navigation.navigate("MainTabs")}>
          <Text style={styles.guardBtnText}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      {confirm && (
        <ConfirmModal message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.logoCircle}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>⌖</Text>
          </View>
          <Text style={styles.logoText}>RoomsFind</Text>
          <View style={styles.adminPill}>
            <Text style={styles.adminPillText}>Admin</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
            <Text style={styles.headerBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs - horizontal scroll like website */}
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error + Refresh */}
      <View style={styles.actionRow}>
        {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ flex: 1 }} />}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setError("");
            if (activeTab === "overview") loadStats();
            else if (activeTab === "users") loadUsers();
            else if (activeTab === "rooms") loadRooms();
            else if (activeTab === "cities") loadCities();
            else if (activeTab === "reports") loadReports();
            else if (activeTab === "flagged") loadFlaggedMessages();
          }}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <View style={{ gap: 16 }}>
            {loading ? (
              <ActivityIndicator color={COLORS.brand} size="large" style={{ marginTop: 40 }} />
            ) : stats ? (
              <>
                <View style={styles.statsGrid}>
                  <StatCard label="Total Users" value={stats.totalUsers} icon="" color="brand" />
                  <StatCard label="Total Rooms" value={stats.totalRooms} icon="" color="blue" />
                  <StatCard label="Available Rooms" value={stats.availableRooms} icon="" color="green" />
                  <StatCard label="Owners" value={stats.totalOwners} icon="" color="purple" />
                </View>
                <View style={styles.overviewCard}>
                  <Text style={styles.cardTitle}>Room Status Overview</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusBox, { backgroundColor: "#ecfdf5" }]}>
                      <Text style={[styles.statusBig, { color: "#059669" }]}>{stats.liveRooms ?? 0}</Text>
                      <Text style={[styles.statusLabel, { color: "#059669" }]}>Live</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { backgroundColor: "#059669", width: `${stats.totalRooms ? (stats.liveRooms / stats.totalRooms) * 100 : 0}%` }]} />
                      </View>
                    </View>
                    <View style={[styles.statusBox, { backgroundColor: "#fff1f2" }]}>
                      <Text style={[styles.statusBig, { color: "#e11d48" }]}>{stats.reportedRooms ?? 0}</Text>
                      <Text style={[styles.statusLabel, { color: "#e11d48" }]}>Reported</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { backgroundColor: "#e11d48", width: `${stats.totalRooms ? (stats.reportedRooms / stats.totalRooms) * 100 : 0}%` }]} />
                      </View>
                    </View>
                    <View style={[styles.statusBox, { backgroundColor: "#eff6ff" }]}>
                      <Text style={[styles.statusBig, { color: "#2563eb" }]}>{stats.occupiedRooms ?? 0}</Text>
                      <Text style={[styles.statusLabel, { color: "#2563eb" }]}>Occupied</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { backgroundColor: "#2563eb", width: `${stats.totalRooms ? (stats.occupiedRooms / stats.totalRooms) * 100 : 0}%` }]} />
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.muted}>Failed to load stats.</Text>
            )}
          </View>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <View style={{ gap: 12 }}>
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}></Text>
              <TextInput
                value={userSearch}
                onChangeText={handleUserSearch}
                placeholder="Search users by name, email, or mobile..."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
            {users.length === 0 ? (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyIcon}></Text>
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySub}>Try a different search term.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {users.map((u) => (
                  <View key={u.email} style={styles.userCard}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={[styles.avatar, { backgroundColor: getAvatarColor(u.name) }]}>
                        <Text style={styles.avatarText}>{getInitials(u.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.userName} numberOfLines={1}>
                            {u.name || "—"}
                          </Text>
                          {u.role === "admin" && <Text style={{ fontSize: 12 }}></Text>}
                        </View>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                          <RoleBadge role={u.role} />
                          <Text style={styles.userDate}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.userMeta}>
                      <Text style={styles.userMetaText}>✉ {u.email}</Text>
                      {u.mobile ? <Text style={styles.userMetaText}>☎ {u.mobile}</Text> : null}
                    </View>
                    <View style={styles.userActions}>
                      <View style={styles.rolePicker}>
                        {["seeker", "owner", "admin"].map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={[styles.roleChip, u.role === role && styles.roleChipActive]}
                            onPress={() => handleRoleChange(u.email, role)}
                            disabled={changingRole === u.email}
                          >
                            <Text style={[styles.roleChipText, u.role === role && styles.roleChipTextActive]}>{role}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {changingRole === u.email && <ActivityIndicator color={COLORS.brand} size="small" />}
                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => setConfirm({ message: `Delete user "${u.email}" and all their rooms?`, action: () => handleDeleteUser(u.email) })}
                      >
                        <Text style={styles.trashText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Pagination page={usersPage} totalPages={usersTotalPages} onPageChange={setUsersPage} />
            <Text style={styles.totalLabel}>
              {usersTotal} user{usersTotal !== 1 ? "s" : ""} total
            </Text>
          </View>
        )}

        {/* ROOMS */}
        {activeTab === "rooms" && (
          <View style={{ gap: 12 }}>
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}></Text>
              <TextInput
                value={roomSearch}
                onChangeText={handleRoomSearch}
                placeholder="Search rooms by title, address, or owner..."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {["", "live", "reported"].map((s) => (
                <TouchableOpacity
                  key={s || "all"}
                  style={[styles.filterChip, roomStatusFilter === s && styles.filterChipActive]}
                  onPress={() => {
                    setRoomStatusFilter(s);
                    setRoomsPage(1);
                  }}
                >
                  <Text style={[styles.filterChipText, roomStatusFilter === s && styles.filterChipTextActive]}>
                    {s ? s.toUpperCase() : "ALL STATUS"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {rooms.length === 0 ? (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyIcon}></Text>
                <Text style={styles.emptyTitle}>No rooms found</Text>
                <Text style={styles.emptySub}>Try adjusting your search or filters.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {rooms.map((room) => (
                  <View key={room.slug || room.id} style={styles.roomCard}>
                    <View style={styles.roomImageWrap}>
                      {room.images?.[0] ? (
                        <Image source={{ uri: room.images[0] }} style={styles.roomImage} />
                      ) : (
                        <View style={styles.roomImagePlaceholder}>
                          <Text style={{ fontSize: 28 }}></Text>
                        </View>
                      )}
                      <View style={styles.roomImageGradient} />
                      <View style={styles.roomCityPill}>
                        <Text style={styles.roomCityText}>{room.city || "—"}</Text>
                      </View>
                      <View style={{ position: "absolute", bottom: 8, right: 8 }}>
                        <StatusBadge status={room.status} />
                      </View>
                    </View>
                    <View style={{ padding: 12, gap: 6 }}>
                      <Text style={styles.roomTitle} numberOfLines={1}>
                        {room.title}
                      </Text>
                      <Text style={styles.roomPrice}>{formatPrice(room.price)}</Text>
                      <Text style={styles.roomOwner} numberOfLines={1}>
                        {room.ownerEmail || room.owner?.email || "—"}
                      </Text>
                      {room.reports > 0 && (
                        <View style={styles.reportPill}>
                          <Text style={styles.reportPillText}>⚠ {room.reports} report{room.reports > 1 ? "s" : ""}</Text>
                        </View>
                      )}
                      <View style={styles.roomActions}>
                        <View style={{ flexDirection: "row", gap: 6, flex: 1 }}>
                          {["live", "reported"].map((st) => (
                            <TouchableOpacity
                              key={st}
                              style={[styles.statusChip, room.status === st && styles.statusChipActive]}
                              onPress={() => handleStatusChange(room.slug, st)}
                              disabled={changingStatus === room.slug}
                            >
                              <Text style={[styles.statusChipText, room.status === st && styles.statusChipTextActive]}>
                                {st.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {changingStatus === room.slug && <ActivityIndicator size="small" color={COLORS.brand} />}
                        {!room.owner?.verified ? (
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => handleVerify(room.slug)}
                            disabled={verifyingSlug === room.slug}
                          >
                            {verifyingSlug === room.slug ? (
                              <ActivityIndicator size="small" color={COLORS.brand} />
                            ) : (
                              <Text style={{ fontSize: 14 }}>✓</Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.iconBtn, { backgroundColor: "#ecfdf5" }]}>
                            <Text style={{ color: "#059669", fontWeight: "900" }}>✓</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => navigation.navigate("RoomDetails", { slug: room.slug, room })}
                        >
                          <Text>👁</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: "#fff1f2" }]}
                          onPress={() => setConfirm({ message: `Delete room "${room.title}"?`, action: () => handleDeleteRoom(room.slug) })}
                        >
                          <Text>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Pagination page={roomsPage} totalPages={roomsTotalPages} onPageChange={setRoomsPage} />
            <Text style={styles.totalLabel}>
              {roomsTotal} room{roomsTotal !== 1 ? "s" : ""} total
            </Text>
          </View>
        )}

        {/* CITIES */}
        {activeTab === "cities" && (
          <View style={{ gap: 12 }}>
            <View style={styles.addCityCard}>
              <Text style={styles.addCityTitle}>Add New City</Text>
              <Text style={styles.fieldLabel}>City name</Text>
              <TextInput
                value={newCityName}
                onChangeText={setNewCityName}
                placeholder="e.g. Jaipur"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>State (optional)</Text>
              <TextInput
                value={newCityState}
                onChangeText={setNewCityState}
                placeholder="e.g. Rajasthan"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
              <TouchableOpacity
                style={[styles.addBtn, (!newCityName.trim() || addingCity) && { opacity: 0.5 }]}
                onPress={handleAddCity}
                disabled={addingCity || !newCityName.trim()}
              >
                {addingCity ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>+ Add City</Text>}
              </TouchableOpacity>
            </View>
            {citiesLoading ? (
              <ActivityIndicator color={COLORS.brand} size="large" style={{ marginTop: 20 }} />
            ) : cities.length > 0 ? (
              <View style={{ gap: 10 }}>
                {cities.map((city) => (
                  <View key={city.name || city._id} style={styles.cityRow}>
                    <View style={styles.cityIcon}>
                      <Text></Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{city.name}</Text>
                      {city.state ? <Text style={styles.cityState}>{city.state}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => setConfirm({ message: `Delete city "${city.name}"? This will not delete rooms in this city.`, action: () => handleDeleteCity(city.name) })}
                    >
                      <Text style={styles.trashText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyIcon}></Text>
                <Text style={styles.emptyTitle}>No cities added yet</Text>
                <Text style={styles.emptySub}>Add your first city to get started.</Text>
              </View>
            )}
          </View>
        )}

        {/* REPORTS */}
        {activeTab === "reports" && (
          <View style={{ gap: 12 }}>
            {reports.length === 0 ? (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>All Clear!</Text>
                <Text style={styles.emptySub}>No reported rooms. Everything looks good.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {reports.map((room) => {
                  const severity = room.reports >= 5 ? "high" : room.reports >= 3 ? "medium" : "low";
                  const color = severity === "high" ? "#e11d48" : severity === "medium" ? "#d97706" : "#94a3b8";
                  return (
                    <View key={room.slug} style={[styles.reportCard, { borderLeftColor: color }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.roomTitle} numberOfLines={1}>
                            {room.title}
                          </Text>
                          <Text style={styles.roomOwner}>{room.city}</Text>
                        </View>
                        <View style={[styles.reportCount, { backgroundColor: severity === "high" ? "#ffe4e6" : severity === "medium" ? "#fef3c7" : "#f1f5f9" }]}>
                          <Text style={[styles.reportCountText, { color }]}>
                            ⚠ {room.reports}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 8, alignItems: "center" }}>
                        <StatusBadge status={room.status} />
                        <Text style={styles.roomOwner} numberOfLines={1}>
                          {room.ownerEmail}
                        </Text>
                      </View>
                      <View style={styles.severityBar}>
                        <View style={[styles.severityFill, { backgroundColor: color, width: severity === "high" ? "100%" : severity === "medium" ? "66%" : "33%" }]} />
                      </View>
                      <View style={styles.roomActions}>
                        <View style={{ flexDirection: "row", gap: 6, flex: 1 }}>
                          {["live", "reported"].map((st) => (
                            <TouchableOpacity
                              key={st}
                              style={[styles.statusChip, room.status === st && styles.statusChipActive]}
                              onPress={() => handleStatusChange(room.slug, st)}
                            >
                              <Text style={[styles.statusChipText, room.status === st && styles.statusChipTextActive]}>{st}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("RoomDetails", { slug: room.slug })}>
                          <Text>👁</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: "#fff1f2" }]}
                          onPress={() => setConfirm({ message: `Delete room "${room.title}"?`, action: () => handleDeleteRoom(room.slug) })}
                        >
                          <Text>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* FLAGGED */}
        {activeTab === "flagged" && (
          <View style={{ gap: 12 }}>
            {flaggedMessages.length === 0 ? (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyIcon}></Text>
                <Text style={styles.emptyTitle}>No Flagged Messages</Text>
                <Text style={styles.emptySub}>All conversations are clean and respectful.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {flaggedMessages.map((msg) => (
                  <View key={msg._id || msg.id} style={styles.flagCard}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={[styles.statIcon, { backgroundColor: "#ffe4e6" }]}>
                        <Text></Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{msg.senderEmail || msg.sender || "—"}</Text>
                        <Text style={styles.userMetaText}>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "—"}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: "#ffe4e6", borderColor: "#fecdd3" }]}>
                        <Text style={[styles.badgeText, { color: "#e11d48" }]}>Flagged</Text>
                      </View>
                    </View>
                    <Text style={styles.flagBody}>{msg.text || msg.message || "—"}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  guardIcon: { fontSize: 40 },
  guardTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  guardSub: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  guardBtn: { marginTop: 12, backgroundColor: COLORS.brand, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  guardBtnText: { color: "#fff", fontWeight: "900" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  logoCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  logoText: { color: COLORS.ink, fontSize: 16, fontWeight: "900" },
  adminPill: { backgroundColor: COLORS.brandSoft, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd6fe" },
  adminPillText: { color: COLORS.brand, fontSize: 11, fontWeight: "900" },
  headerBtn: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#fff" },
  headerBtnText: { color: COLORS.muted, fontSize: 11, fontWeight: "900" },
  tabBarWrap: { borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  tabBar: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  tabText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#fff" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  errorText: { flex: 1, backgroundColor: "#fff1f2", color: "#e11d48", fontSize: 11, fontWeight: "700", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fecdd3" },
  refreshBtn: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fff" },
  refreshText: { color: COLORS.muted, fontSize: 11, fontWeight: "900" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", flexDirection: "row", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, alignItems: "center" },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statValue: { color: COLORS.ink, fontSize: 18, fontWeight: "900", marginTop: 2 },
  overviewCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16 },
  cardTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900", marginBottom: 12 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
  statusBig: { fontSize: 20, fontWeight: "900" },
  statusLabel: { fontSize: 10, fontWeight: "800", marginTop: 2, textTransform: "uppercase" },
  barTrack: { marginTop: 8, width: 60, height: 6, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, height: 42 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: "600" },
  emptyDashed: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 16, padding: 24, alignItems: "center", gap: 6 },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900" },
  emptySub: { color: COLORS.muted, fontSize: 12, fontWeight: "600", textAlign: "center" },
  userCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "900", color: COLORS.ink },
  userName: { color: COLORS.ink, fontSize: 13, fontWeight: "900", flexShrink: 1 },
  userDate: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  userMeta: { borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 8, gap: 4 },
  userMetaText: { color: COLORS.muted, fontSize: 11, fontWeight: "600" },
  userActions: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 10 },
  rolePicker: { flexDirection: "row", gap: 6, flex: 1 },
  roleChip: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", backgroundColor: "#fff" },
  roleChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  roleChipText: { fontSize: 10, fontWeight: "800", color: COLORS.muted, textTransform: "capitalize" },
  roleChipTextActive: { color: "#fff" },
  trashBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fecdd3" },
  trashText: { fontSize: 14 },
  badge: { borderWidth: 1, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "900" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  pageBtnText: { fontSize: 18, fontWeight: "900", color: COLORS.ink },
  pageLabel: { fontSize: 12, fontWeight: "800", color: COLORS.muted },
  totalLabel: { textAlign: "center", color: COLORS.muted, fontSize: 11, fontWeight: "700", marginTop: 4 },
  muted: { color: COLORS.muted, fontSize: 13, textAlign: "center" },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  filterChipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterChipText: { fontSize: 10, fontWeight: "900", color: COLORS.muted },
  filterChipTextActive: { color: "#fff" },
  roomCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: "hidden" },
  roomImageWrap: { height: 120, backgroundColor: "#f1f5f9", position: "relative" },
  roomImage: { width: "100%", height: "100%" },
  roomImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  roomImageGradient: { position: "absolute", inset: 0, backgroundColor: "transparent" },
  roomCityPill: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(255,255,255,0.95)", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  roomCityText: { fontSize: 11, fontWeight: "900", color: COLORS.ink },
  roomTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  roomPrice: { color: COLORS.brand, fontSize: 14, fontWeight: "900" },
  roomOwner: { color: COLORS.muted, fontSize: 11, fontWeight: "600" },
  reportPill: { backgroundColor: "#fff1f2", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: "#fecdd3" },
  reportPillText: { color: "#e11d48", fontSize: 11, fontWeight: "800" },
  roomActions: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 10, marginTop: 4 },
  statusChip: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  statusChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  statusChipText: { fontSize: 10, fontWeight: "900", color: COLORS.muted },
  statusChipTextActive: { color: "#fff" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  addCityCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, gap: 8 },
  addCityTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", marginBottom: 4 },
  fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginTop: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.ink, fontSize: 13 },
  addBtn: { backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 },
  cityIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  cityName: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  cityState: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  reportCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderRadius: 12, padding: 12 },
  reportCount: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  reportCountText: { fontSize: 11, fontWeight: "900" },
  severityBar: { height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginTop: 10 },
  severityFill: { height: "100%", borderRadius: 3 },
  flagCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, gap: 8 },
  flagBody: { color: COLORS.ink, fontSize: 12, lineHeight: 18, backgroundColor: COLORS.background, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", alignItems: "center", justifyContent: "center", padding: 20 },
  confirmBox: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.border },
  confirmText: { color: COLORS.ink, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  confirmRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#fff" },
  cancelText: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  confirmBtn: { flex: 1, backgroundColor: "#e11d48", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
