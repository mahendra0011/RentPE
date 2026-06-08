import {
  Building2,
  Check,
  ChevronDown,
  Heart,
  LocateFixed,
  Loader2,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  cityOptions,
  getCityFromStorage,
  getCityOption,
  getCityOptionFromLocation,
  saveCityToStorage,
} from "@/lib/listingMeta.js";
import { apiRequest } from "@/lib/api.js";
import { logout } from "@/store/authSlice.js";

function Logo({ onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2"
      aria-label="RentPE home"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/25">
        <MapPin className="size-4" strokeWidth={2.6} />
      </span>
      <span className="text-lg font-black tracking-normal text-ink">RentPE</span>
    </Link>
  );
}

function ListRoomCta({ onClick, className = "" }) {
  return (
    <Link
      to="/list-room"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800 ${className}`}
    >
      List Your Room
    </Link>
  );
}

function MyRoomsLink({ onClick, className = "" }) {
  return (
    <Link
      to="/my-rooms"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
    >
      <Building2 className="size-4" />
      My Rooms
    </Link>
  );
}

function AuthLinks({ onClick }) {
  return (
    <>
      <Link
        to="/login"
        onClick={onClick}
        className="flex min-h-10 min-w-20 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand"
      >
        Login
      </Link>
      <Link
        to="/signup"
        onClick={onClick}
        className="flex min-h-10 min-w-24 items-center justify-center rounded-full bg-brand px-5 text-sm font-black text-brand-foreground shadow-sm shadow-brand/20 transition-colors hover:bg-brand/90"
      >
        Signup
      </Link>
    </>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const wishlistCount = useSelector((state) => state.rooms.savedIds.length);
  const isOwner = user?.role === "owner";

  useEffect(() => {
    const storedTheme = localStorage.getItem("rentpe:theme");
    const shouldUseDark =
      storedTheme === "dark" ||
      (!storedTheme && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);
    localStorage.setItem("rentpe:theme", nextMode ? "dark" : "light");
  }

  function closeMenu() {
    setOpen(false);
  }

  function handleLogout() {
    dispatch(logout());
    closeMenu();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-background/95 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <div className="hidden items-center gap-7 text-sm font-black text-slate-500 md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/find-room"
            className={({ isActive }) =>
              `transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`
            }
          >
            Find Room
          </NavLink>
          <NavLink
            to="/wishlist"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 transition-colors hover:text-ink ${
                isActive ? "text-ink" : ""
              }`
            }
          >
            <Heart className="size-4" />
            Wishlist
            {wishlistCount > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] leading-none text-white">
                {wishlistCount}
              </span>
            )}
          </NavLink>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand hover:text-brand"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {user ? (
            <>
              <span className="max-w-36 truncate text-sm font-black text-slate-600">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-ink"
                aria-label="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <AuthLinks />
          )}
          {isOwner && (
            <>
              <MyRoomsLink />
              <ListRoomCta />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand hover:text-brand"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <NavLink
              to="/"
              end
              onClick={closeMenu}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-black ${
                  isActive ? "bg-brand-soft text-brand" : "text-slate-700"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/find-room"
              onClick={closeMenu}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-black ${
                  isActive ? "bg-brand-soft text-brand" : "text-slate-700"
                }`
              }
            >
              Find Room
            </NavLink>
            <NavLink
              to="/wishlist"
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black ${
                  isActive ? "bg-brand-soft text-brand" : "text-slate-700"
                }`
              }
            >
              <span className="inline-flex items-center gap-2">
                <Heart className="size-4" />
                Wishlist
              </span>
              {wishlistCount > 0 && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] leading-none text-white">
                  {wishlistCount}
                </span>
              )}
            </NavLink>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black text-slate-700"
            >
              <span className="inline-flex items-center gap-2">
                {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {darkMode ? "Light mode" : "Dark mode"}
              </span>
            </button>
            {user ? (
              <>
                <span className="rounded-xl px-3 py-2 text-sm font-black text-slate-500">
                  {user.name || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl px-3 py-2 text-left text-sm font-black text-slate-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-3 pt-2">
                <AuthLinks onClick={closeMenu} />
              </div>
            )}
            {isOwner && (
              <>
                <MyRoomsLink onClick={closeMenu} />
                <ListRoomCta onClick={closeMenu} />
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
