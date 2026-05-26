import { Heart, LogOut, MapPin, Menu, X } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink } from "react-router-dom";

import { logout } from "@/store/authSlice.js";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="RentPE home">
      <span className="flex size-8 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/25">
        <MapPin className="size-4" strokeWidth={2.6} />
      </span>
      <span className="text-lg font-black tracking-normal text-ink">RentPE</span>
    </Link>
  );
}

function ListRoomCta({ onClick }) {
  return (
    <Link
      to="/list-room"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800"
    >
      List Your Room
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
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const wishlistCount = useSelector((state) => state.rooms.savedIds.length);
  const isOwner = user?.role === "owner";

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
            to="/roommates"
            className={({ isActive }) =>
              `transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`
            }
          >
            Find Roommate
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
          {isOwner && <ListRoomCta />}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
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
              to="/roommates"
              onClick={closeMenu}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-black ${
                  isActive ? "bg-brand-soft text-brand" : "text-slate-700"
                }`
              }
            >
              Find Roommate
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
            {isOwner && <ListRoomCta onClick={closeMenu} />}
          </div>
        </div>
      )}
    </header>
  );
}
