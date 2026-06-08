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
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-ink shadow-sm transition-colors hover:border-brand hover:text-brand ${className}`}
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
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => getCityFromStorage());
  const [detectingCity, setDetectingCity] = useState(false);
  const [detectCityError, setDetectCityError] = useState("");
  const [cityPickerOpenKey, setCityPickerOpenKey] = useState(0);
  const [cityPromptPaused, setCityPromptPaused] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const wishlistCount = useSelector((state) => state.rooms.savedIds.length);
  const isOwner = user?.role === "owner";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("rentpe:theme");
    const shouldUseDark =
      storedTheme === "dark" ||
      (!storedTheme && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

    setDarkMode(shouldUseDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cityFromUrl = params.get("city");

    if (cityFromUrl !== null) {
      setSelectedCity(cityFromUrl);
      saveCityToStorage(cityFromUrl);
    } else if (location.pathname === "/find-room") {
      setSelectedCity(getCityFromStorage());
    }
  }, [location.pathname, location.search]);

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);
    localStorage.setItem("rentpe:theme", nextMode ? "dark" : "light");
  }

  function handleLogout() {
    dispatch(logout());
    setMenuOpen(false);
  }

  function handleCityChange(city) {
    const nextCity = getCityOption(city).city;
    if (!nextCity) return;

    setSelectedCity(nextCity);
    saveCityToStorage(nextCity);
    setDetectCityError("");
    setCityPromptPaused(false);

    const params =
      location.pathname === "/find-room"
        ? new URLSearchParams(location.search)
        : new URLSearchParams();

    params.set("city", nextCity);
    params.set("filters", "1");

    const query = params.toString();
    navigate(`/find-room${query ? `?${query}` : ""}`);
  }

  function handleOpenNavbarCityPicker() {
    setCityPromptPaused(true);
    setMenuOpen(true);
    setCityPickerOpenKey((key) => key + 1);
  }

  function handleCityPickerOpenChange(open) {
    if (!open && !getCityOption(selectedCity).city) {
      setCityPromptPaused(false);
    }
  }

  async function handleUseCurrentLocation() {
    setDetectCityError("");
    setDetectingCity(true);

    try {
      const [longitude, latitude] = await getBrowserCoordinates();
      const payload = await apiRequest(
        `/api/geo/reverse?longitude=${encodeURIComponent(longitude)}&latitude=${encodeURIComponent(
          latitude,
        )}`,
      );
      const cityOption = getCityOptionFromLocation(payload);

      if (!cityOption.city) {
        throw new Error("City could not be detected from your location.");
      }

      handleCityChange(cityOption.city);
    } catch (error) {
      setDetectCityError(error.message || "City could not be detected from your location.");
    } finally {
      setDetectingCity(false);
    }
  }

  return (
    <>
      <header className="relative sticky top-0 z-50 border-b border-slate-200 bg-white/92 shadow-[0_10px_28px_-26px_rgba(15,23,42,0.45)] backdrop-blur">
        <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />

          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 xl:flex">
            <NavLinks wishlistCount={wishlistCount} className="pointer-events-auto" />
          </div>

          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            <CitySelect
              value={selectedCity}
              onChange={handleCityChange}
              onDetectCity={handleUseCurrentLocation}
              detectingCity={detectingCity}
              detectCityError={detectCityError}
              forceOpenKey={cityPickerOpenKey}
              onOpenChange={handleCityPickerOpenChange}
              className="w-[220px]"
            />
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
                <span className="max-w-28 truncate text-sm font-black text-slate-600 2xl:max-w-36">
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
