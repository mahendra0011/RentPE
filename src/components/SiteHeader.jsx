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
              <AuthLinks />
            )}
            {isOwner && (
              <>
                <MyRoomsLink />
                <ListRoomCta className="px-4 2xl:px-5" />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 xl:hidden">
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
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white/95 shadow-[0_28px_65px_-36px_rgba(15,23,42,0.45)] backdrop-blur xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6">
              <CitySelect
                value={selectedCity}
                onChange={handleCityChange}
                onDetectCity={handleUseCurrentLocation}
                detectingCity={detectingCity}
                detectCityError={detectCityError}
                forceOpenKey={cityPickerOpenKey}
                onOpenChange={handleCityPickerOpenChange}
                className="w-full"
              />

              <NavLinks
                wishlistCount={wishlistCount}
                onNavigate={() => setMenuOpen(false)}
                variant="mobile"
              />

              <div className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3">
                {user ? (
                  <>
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5">
                      <span className="min-w-0 truncate text-sm font-black text-ink">
                        {user.name || user.email}
                      </span>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition-colors hover:border-brand hover:text-brand"
                      >
                        <LogOut className="size-4" />
                        Logout
                      </button>
                    </div>
                    {isOwner && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <MyRoomsLink onClick={() => setMenuOpen(false)} className="w-full" />
                        <ListRoomCta onClick={() => setMenuOpen(false)} className="w-full" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <AuthLinks onClick={() => setMenuOpen(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      {!getCityOption(selectedCity).city && !cityPromptPaused && (
        <CityRequiredModal
          onOpenCityPicker={handleOpenNavbarCityPicker}
          detectCityError={detectCityError}
        />
      )}
    </>
  );
}

function NavLinks({ wishlistCount, className = "", onNavigate, variant = "desktop" }) {
  const isMobile = variant === "mobile";
  const listClassName = isMobile
    ? "grid gap-1 rounded-[22px] border border-slate-200 bg-slate-50 p-1 text-sm font-black text-slate-500 shadow-sm"
    : `flex items-center gap-5 rounded-full border border-slate-200/70 bg-white/70 px-5 py-2 text-sm font-black text-slate-500 shadow-sm backdrop-blur ${className}`;
  const linkClassName = (isActive, extra = "") =>
    `${
      isMobile
        ? "flex min-h-11 items-center justify-between rounded-[18px] px-4 transition-colors hover:bg-white hover:text-ink"
        : "transition-colors hover:text-ink"
    } ${isActive ? (isMobile ? "bg-white text-ink shadow-sm" : "text-ink") : ""} ${extra}`;

  return (
    <div className={listClassName}>
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        className={({ isActive }) => linkClassName(isActive)}
      >
        Home
      </NavLink>
      <NavLink
        to="/find-room"
        onClick={onNavigate}
        className={({ isActive }) => linkClassName(isActive)}
      >
        Find Room
      </NavLink>
      <NavLink
        to="/wishlist"
        onClick={onNavigate}
        className={({ isActive }) =>
          linkClassName(isActive, isMobile ? "" : "inline-flex items-center gap-1.5")
        }
      >
        <span className="inline-flex items-center gap-2">
          <Heart className="size-4" />
          Wishlist
        </span>
        {wishlistCount > 0 && (
          <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] leading-none text-white">
            {wishlistCount}
          </span>
        )}
      </NavLink>
    </div>
  );
}

function CityRequiredModal({ onOpenCityPicker, detectCityError }) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_32px_90px_-34px_rgba(15,23,42,0.8)] sm:p-6">
        <div className="mb-5">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <MapPinned className="size-5" />
          </span>
          <h2 className="text-2xl font-black tracking-normal text-ink">Select your city</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            Choose your city from the navbar city picker to continue. RentPE will show rooms, map
            markers, and routes for that city.
          </p>
        </div>
        {detectCityError && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">
            {detectCityError}
          </p>
        )}
        <button
          type="button"
          onClick={onOpenCityPicker}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-colors hover:bg-brand/90"
        >
          <MapPinned className="size-4" />
          Choose city from navbar
        </button>
      </div>
    </div>
  );
}

function CitySelect({
  value,
  onChange,
  onDetectCity,
  detectingCity = false,
  detectCityError = "",
  className = "",
  forceOpenKey = 0,
  onOpenChange,
}) {
  const selectedCity = getCityOption(value).city;
  const selectedOption = getCityOption(value);
  const selectedLabel = selectedOption.city || "Select city";
  const selectedState = selectedOption.city ? selectedOption.state : "Required";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const setOpenState = useCallback(
    (nextOpen) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );
  const filteredCities = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    const matches = cityOptions.filter((option) => {
      if (!normalizedQuery) return true;

      return normalizeSearch(
        `${option.city} ${option.state} ${option.label} ${(option.aliases || []).join(" ")}`,
      ).includes(normalizedQuery);
    });

    return matches;
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;

    function onDocumentClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpenState(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open, setOpenState]);

  useEffect(() => {
    if (!forceOpenKey) return;
    setOpenState(true);
  }, [forceOpenKey, setOpenState]);

  function selectCity(city) {
    onChange(city);
    setOpenState(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpenState(!open)}
        className="flex min-h-11 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-left text-sm shadow-sm transition-colors hover:border-brand focus:border-brand focus:outline-none"
        aria-label={`Select city, ${selectedLabel}, ${selectedState}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <MapPinned className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black text-ink">{selectedLabel}</span>
          <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {selectedState}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] lg:left-auto lg:w-[340px]">
          <div className="border-b border-slate-100 p-3">
            <label className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:bg-white">
              <Search className="size-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search city"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          <div className="max-h-[340px] overflow-y-auto p-2" role="listbox">
            <button
              type="button"
              onClick={onDetectCity}
              disabled={detectingCity}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft px-3 py-3 text-left text-brand transition-colors hover:border-brand disabled:cursor-wait disabled:opacity-75"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                {detectingCity ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LocateFixed className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">
                  {detectingCity ? "Detecting your city" : "Use my location"}
                </span>
                <span className="block truncate text-xs font-bold text-brand/70">
                  Select city automatically
                </span>
              </span>
            </button>
            {detectCityError && (
              <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">
                {detectCityError}
              </p>
            )}
            {filteredCities.map((option) => {
              const active = selectedCity === option.city;

              return (
                <button
                  key={`${option.city}-${option.state || "all"}`}
                  type="button"
                  onClick={() => selectCity(option.city)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-brand-soft" : "hover:bg-slate-50"
                  }`}
                  role="option"
                  aria-selected={active}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      active ? "bg-brand text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <LocateFixed className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-ink">
                      {option.city}
                    </span>
                    <span className="block truncate text-xs font-bold text-slate-500">
                      {option.state}
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0 text-brand" />}
                </button>
              );
            })}

            {filteredCities.length === 0 && (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-black text-ink">City not found</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Try another spelling.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getBrowserCoordinates() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location permission is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      () => reject(new Error("Allow location permission to select your city automatically.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
