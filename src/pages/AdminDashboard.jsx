import {
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Eye,
  Flag,
  Globe,
  Home,
  Loader2,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "@/lib/api.js";
import { formatPrice } from "@/lib/format.js";
import { logout } from "@/store/authSlice.js";

const tabs = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "users", label: "Users", icon: Users },
  { id: "rooms", label: "Rooms", icon: Building2 },
  { id: "cities", label: "Cities", icon: Globe },
  { id: "reports", label: "Reports", icon: CircleAlert },
  { id: "flagged", label: "Flagged Msgs", icon: Shield },
];

function StatCard({ icon: Icon, label, value, color = "brand" }) {
  const colorMap = {
    brand: "bg-brand-soft text-brand",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    cyan: "bg-cyan-50 text-cyan-600",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${colorMap[color] || colorMap.brand}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-2xl font-black text-ink">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    live: "bg-emerald-50 text-emerald-700 border-emerald-200",
    reported: "bg-rose-50 text-rose-700 border-rose-200",
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    occupied: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {status}
    </span>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin: "bg-purple-50 text-purple-700 border-purple-200",
    owner: "bg-blue-50 text-blue-700 border-blue-200",
    seeker: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles[role] || styles.seeker}`}
    >
      {role}
    </span>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel, loading = false }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_32px_90px_-34px_rgba(15,23,42,0.8)]">
        <p className="text-center text-sm font-bold leading-6 text-slate-600">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-ink transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-11 flex-1 rounded-xl bg-rose-600 px-4 text-sm font-black text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-3 text-sm font-bold text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function getInitials(name) {
  return name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function getAvatarColor(name) {
  const colors = [
    "bg-brand-soft text-brand",
    "bg-emerald-50 text-emerald-600",
    "bg-amber-50 text-amber-600",
    "bg-rose-50 text-rose-600",
    "bg-blue-50 text-blue-600",
    "bg-purple-50 text-purple-600",
    "bg-cyan-50 text-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("overview");
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const userSearchTimer = useRef(null);
  const roomSearchTimer = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("rentpe:theme");
    const shouldUseDark =
      stored === "dark" || (!stored && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "users") return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab, usersPage, userSearch]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "rooms") return;
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab, roomsPage, roomSearch, roomStatusFilter]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "reports") return;
    loadReports();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "cities") return;
    loadCities();
  }, [isAdmin, activeTab]);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("rentpe:theme", next ? "dark" : "light");
  }

  function handleLogout() {
    dispatch(logout());
    navigate("/");
  }

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
      const params = new URLSearchParams({ page: usersPage, limit: "20" });
      if (userSearch.trim()) params.set("search", userSearch.trim());
      const data = await apiRequest(`/api/admin/users?${params}`);
      setUsers(data.users);
      setUsersTotal(data.total);
      setUsersTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    }
  }

  async function loadRooms() {
    try {
      const params = new URLSearchParams({ page: roomsPage, limit: "20" });
      if (roomSearch.trim()) params.set("search", roomSearch.trim());
      if (roomStatusFilter) params.set("status", roomStatusFilter);
      const data = await apiRequest(`/api/admin/rooms?${params}`);
      setRooms(data.rooms);
      setRoomsTotal(data.total);
      setRoomsTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load rooms.");
    }
  }

  async function loadReports() {
    try {
      const data = await apiRequest("/api/admin/reports");
      setReports(data.rooms || []);
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    }
  }

  async function loadCities() {
    setCitiesLoading(true);
    try {
      const data = await apiRequest("/api/admin/cities");
      setCities(Array.isArray(data) ? data : []);
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-lg font-black text-ink">Login required</p>
          <Link
            to="/login"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-black text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-lg font-black text-ink">Access denied</p>
          <p className="mt-1 text-sm font-bold text-slate-500">Admin privileges required.</p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-black text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
          loading={confirm.loading}
        />
      )}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/92 shadow-[0_10px_28px_-26px_rgba(15,23,42,0.45)] backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="RentPE home">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/25">
              <MapPinned className="size-4" strokeWidth={2.6} />
            </span>
            <span className="text-lg font-black tracking-normal text-ink">RentPE</span>
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-black text-purple-700">
              <Shield className="size-3.5" />
              Admin
            </span>
            <span className="max-w-28 truncate text-sm font-black text-slate-600">
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand hover:text-brand"
              aria-label={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              to="/"
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-ink"
              aria-label="Home"
            >
              <Home className="size-4" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-ink"
              aria-label="Logout"
            >
              <LogOut className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink"
              aria-label={menuOpen ? "Close" : "Menu"}
            >
              {menuOpen ? <XCircle className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="border-b border-slate-200 bg-white xl:hidden">
            <div className="mx-auto max-w-7xl space-y-2 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-xs font-black text-purple-700">
                <Shield className="size-3.5" />
                Admin: {user?.name || user?.email}
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black transition-colors ${activeTab === tab.id ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </button>
              ))}
              <Link
                to="/"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Home className="size-4" />
                Main Site
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black text-slate-600 transition-colors hover:bg-slate-50"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition-colors ${activeTab === tab.id ? "bg-ink text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand"}`}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-3 sm:flex-none">
            {error && (
              <p className="flex-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setError("");
                if (activeTab === "overview") loadStats();
                else if (activeTab === "users") loadUsers();
                else if (activeTab === "rooms") loadRooms();
                else if (activeTab === "cities") loadCities();
                else if (activeTab === "reports") loadReports();
                else if (activeTab === "flagged") loadFlaggedMessages();
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition-colors hover:border-brand hover:text-brand"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ==================== OVERVIEW ==================== */}
        {activeTab === "overview" && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 animate-spin text-brand" />
              </div>
            ) : stats ? (
              <div className="space-y-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="brand" />
                  <StatCard icon={Building2} label="Total Rooms" value={stats.totalRooms} color="blue" />
                  <StatCard icon={BedDouble} label="Available Rooms" value={stats.availableRooms} color="green" />
                  <StatCard icon={UserCog} label="Owners" value={stats.totalOwners} color="purple" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-5 flex items-center gap-2 text-base font-black text-ink">
                    <Building2 className="size-5 text-brand" />
                    Room Status Overview
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-emerald-50 p-5 text-center transition-all hover:shadow-sm">
                      <p className="text-3xl font-black text-emerald-600">{stats.liveRooms}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-700">Live</p>
                      <div className="mx-auto mt-3 h-2 w-full max-w-24 rounded-full bg-emerald-200">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.totalRooms > 0 ? (stats.liveRooms / stats.totalRooms) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-5 text-center transition-all hover:shadow-sm">
                      <p className="text-3xl font-black text-rose-600">{stats.reportedRooms}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-rose-700">Reported</p>
                      <div className="mx-auto mt-3 h-2 w-full max-w-24 rounded-full bg-rose-200">
                        <div className="h-full rounded-full bg-rose-500" style={{ width: `${stats.totalRooms > 0 ? (stats.reportedRooms / stats.totalRooms) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-5 text-center transition-all hover:shadow-sm">
                      <p className="text-3xl font-black text-blue-600">{stats.occupiedRooms}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-700">Occupied</p>
                      <div className="mx-auto mt-3 h-2 w-full max-w-24 rounded-full bg-blue-200">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${stats.totalRooms > 0 ? (stats.occupiedRooms / stats.totalRooms) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-sm font-bold text-slate-500">Failed to load stats.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== USERS ==================== */}
        {activeTab === "users" && (
          <div>
            <div className="mb-5 flex items-center gap-3">
              <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  type="search"
                  placeholder="Search users by name, email, or mobile..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-card py-20 shadow-sm">
                <Users className="mb-3 size-12 text-slate-300" />
                <p className="text-sm font-black text-ink">No users found</p>
                <p className="mt-1 text-xs font-bold text-slate-400">Try a different search term.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((u) => (
                  <div
                    key={u.email}
                    className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-4">
                      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-black ${getAvatarColor(u.name)}`}>
                        {getInitials(u.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-ink">{u.name || "—"}</p>
                          {u.role === "admin" && <Shield className="size-3.5 text-purple-500 shrink-0" />}
                          {u.role === "owner" && <BadgeCheck className="size-3.5 text-blue-500 shrink-0" />}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <RoleBadge role={u.role} />
                          <span className="text-[10px] font-bold text-slate-400">
                            <CalendarDays className="inline size-3 mr-0.5" />
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-medium">{u.email}</span>
                      </div>
                      {u.mobile && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone className="size-3.5 shrink-0 text-slate-400" />
                          <span className="font-medium">{u.mobile}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.email, e.target.value)}
                        disabled={changingRole === u.email}
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 outline-none transition-colors hover:border-brand disabled:opacity-50 flex-1"
                      >
                        <option value="seeker">Seeker</option>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                      </select>
                      {changingRole === u.email && <Loader2 className="size-3 animate-spin text-brand shrink-0" />}
                      <button
                        type="button"
                        onClick={() => setConfirm({ message: `Delete user "${u.email}" and all their rooms?`, action: () => handleDeleteUser(u.email) })}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 shrink-0"
                        title="Delete user"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination page={usersPage} totalPages={usersTotalPages} onPageChange={setUsersPage} />
            <p className="pt-3 text-center text-xs font-bold text-slate-400">
              {usersTotal} user{usersTotal !== 1 ? "s" : ""} total
            </p>
          </div>
        )}

        {/* ==================== ROOMS ==================== */}
        {activeTab === "rooms" && (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={roomSearch}
                  onChange={(e) => handleRoomSearch(e.target.value)}
                  type="search"
                  placeholder="Search rooms by title, address, or owner email..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
                />
              </label>
              <select
                value={roomStatusFilter}
                onChange={(e) => { setRoomStatusFilter(e.target.value); setRoomsPage(1); }}
                className="h-11 cursor-pointer rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none transition-colors hover:border-brand"
              >
                <option value="">All status</option>
                <option value="live">Live</option>
                <option value="reported">Reported</option>
              </select>
            </div>

            {rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-card py-20 shadow-sm">
                <Building2 className="mb-3 size-12 text-slate-300" />
                <p className="text-sm font-black text-ink">No rooms found</p>
                <p className="mt-1 text-xs font-bold text-slate-400">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <div
                    key={room.slug}
                    className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                  >
                    {/* Image header */}
                    <div className="relative h-36 bg-slate-100 overflow-hidden">
                      {room.images?.[0] ? (
                        <img src={room.images[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Building2 className="size-10 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="truncate rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-black text-ink backdrop-blur shadow-sm">
                          {room.city}
                        </span>
                        <StatusBadge status={room.status} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="truncate text-sm font-black text-ink">{room.title}</p>
                      <p className="mt-1 text-lg font-black text-brand">{formatPrice(room.price)}</p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-400">{room.ownerEmail}</p>

                      {/* Reports count */}
                      {room.reports > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
                          <CircleAlert className="size-3" />
                          {room.reports} report{room.reports > 1 ? "s" : ""}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <select
                          value={room.status}
                          onChange={(e) => handleStatusChange(room.slug, e.target.value)}
                          disabled={changingStatus === room.slug}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 outline-none transition-colors hover:border-brand disabled:opacity-50 flex-1"
                        >
                          <option value="live">Live</option>
                          <option value="reported">Reported</option>
                        </select>
                        {changingStatus === room.slug && <Loader2 className="size-3 animate-spin text-brand shrink-0" />}
                        <Link
                          to={`/rooms/${room.slug}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="View room"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirm({ message: `Delete room "${room.title}"?`, action: () => handleDeleteRoom(room.slug) })}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Delete room"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination page={roomsPage} totalPages={roomsTotalPages} onPageChange={setRoomsPage} />
            <p className="pt-3 text-center text-xs font-bold text-slate-400">
              {roomsTotal} room{roomsTotal !== 1 ? "s" : ""} total
            </p>
          </div>
        )}

        {/* ==================== CITIES ==================== */}
        {activeTab === "cities" && (
          <div>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-ink">
                <Plus className="size-4 text-brand" />
                Add New City
              </h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="city-name" className="mb-1.5 block text-xs font-bold text-slate-500">City name</label>
                  <input
                    id="city-name"
                    type="text"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full rounded-xl border border-slate-200 bg-background px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label htmlFor="city-state" className="mb-1.5 block text-xs font-bold text-slate-500">State (optional)</label>
                  <input
                    id="city-state"
                    type="text"
                    value={newCityState}
                    onChange={(e) => setNewCityState(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full rounded-xl border border-slate-200 bg-background px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCity}
                  disabled={addingCity || !newCityName.trim()}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-black text-brand-foreground transition-all hover:bg-brand/90 hover:shadow-lg hover:shadow-brand/25 disabled:opacity-50"
                >
                  {addingCity ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {addingCity ? "Adding..." : "Add City"}
                </button>
              </div>
            </div>

            {citiesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-brand" />
              </div>
            ) : cities.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cities.map((city) => (
                  <div
                    key={city.name || city._id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <MapPinned className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-ink">{city.name}</p>
                        {city.state && <p className="text-xs font-bold text-slate-400">{city.state}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirm({ message: `Delete city "${city.name}"? This will not delete rooms in this city.`, action: () => handleDeleteCity(city.name) })}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title={`Delete ${city.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-card py-16 shadow-sm">
                <Globe className="mb-3 size-10 text-slate-300" />
                <p className="text-sm font-black text-ink">No cities added yet</p>
                <p className="mt-1 text-xs font-bold text-slate-400">Add your first city to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== REPORTS ==================== */}
        {activeTab === "reports" && (
          <div>
            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                <ShieldCheck className="mb-3 size-14 text-emerald-400" />
                <p className="text-lg font-black text-ink">All Clear!</p>
                <p className="mt-1 text-sm font-bold text-slate-500">No reported rooms. Everything looks good.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((room) => {
                  const severity = room.reports >= 5 ? "high" : room.reports >= 3 ? "medium" : "low";
                  const severityStyles = {
                    high: "border-l-rose-500 bg-rose-50/50",
                    medium: "border-l-amber-500 bg-amber-50/30",
                    low: "border-l-slate-300 bg-white",
                  };

                  return (
                    <div
                      key={room.slug}
                      className={`relative rounded-2xl border border-slate-200 border-l-4 p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${severityStyles[severity]}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link to={`/rooms/${room.slug}`} className="block truncate text-sm font-black text-ink transition-colors hover:text-brand">
                            {room.title}
                          </Link>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <MapPinned className="size-3" />
                            {room.city}
                          </p>
                        </div>
                        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          severity === "high" ? "bg-rose-100 text-rose-700" :
                          severity === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          <CircleAlert className="size-3" />
                          {room.reports}
                        </span>
                      </div>

                      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                        <StatusBadge status={room.status} />
                        <span className="truncate">{room.ownerEmail}</span>
                      </div>

                      {/* Severity bar */}
                      <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          severity === "high" ? "bg-rose-500 w-full" :
                          severity === "medium" ? "bg-amber-500 w-2/3" :
                          "bg-slate-400 w-1/3"
                        }`} />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={room.status}
                          onChange={(e) => handleStatusChange(room.slug, e.target.value)}
                          disabled={changingStatus === room.slug}
                          className="min-h-9 flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none transition-colors hover:border-brand disabled:opacity-50"
                        >
                          <option value="live">Live</option>
                          <option value="reported">Reported</option>
                        </select>
                        <Link to={`/rooms/${room.slug}`} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-brand hover:text-brand">
                          <Eye className="size-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirm({ message: `Delete room "${room.title}"?`, action: () => handleDeleteRoom(room.slug) })}
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== FLAGGED MESSAGES ==================== */}
        {activeTab === "flagged" && (
          <div>
            {flaggedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                <ShieldCheck className="mb-3 size-14 text-emerald-400" />
                <p className="text-lg font-black text-ink">No Flagged Messages</p>
                <p className="mt-1 text-sm font-bold text-slate-500">All conversations are clean and respectful.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {flaggedMessages.map((msg) => (
                  <div
                    key={msg._id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                          <MessageSquare className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-ink">{msg.senderEmail}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            <CalendarDays className="inline size-3 mr-0.5" />
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">
                        <Flag className="size-3" />
                        Flagged
                      </span>
                    </div>

                    {/* Message content */}
                    <div className="relative rounded-xl bg-slate-50 p-4">
                      <p className="text-sm leading-6 text-slate-600 line-clamp-3">
                        {msg.text || "(media message)"}
                      </p>
                      {msg.text && msg.text.length > 150 && (
                        <p className="mt-1 text-[10px] font-bold text-slate-400">Click to expand</p>
                      )}
                    </div>

                    {msg.flagReason && (
                      <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                        <ShieldAlert className="size-3.5 shrink-0" />
                        {msg.flagReason}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <p className="text-[10px] font-bold text-slate-400">
                        Flagged by: {msg.flaggedBy || "unknown"}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await apiRequest(`/api/admin/flagged-messages/${msg._id}/dismiss`, { method: "PATCH" });
                            setFlaggedMessages((prev) => prev.filter((m) => m._id !== msg._id));
                          } catch { /* ignore */ }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}