import { ArrowRight, Lock, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import { clearAuthError, loginUser, signupUser } from "@/store/authSlice.js";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);
  const isSignup = location.pathname.includes("signup");
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ownerFromUrl = query.get("owner") === "1";
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    isOwner: ownerFromUrl,
  });
  const loading = status === "loading";

  useEffect(() => {
    setForm((current) => ({ ...current, isOwner: ownerFromUrl }));
    dispatch(clearAuthError());
  }, [dispatch, ownerFromUrl, isSignup]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const action = isSignup ? signupUser : loginUser;
      const result = await dispatch(action(form)).unwrap();
      navigate(result.user.role === "owner" ? "/list-room" : "/search?all=1");
    } catch {
      // Redux slice stores the visible error message.
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
            <ShieldCheck className="size-4" />
            Secure account
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl">
            {isSignup ? "Create your RoomRadar account." : "Login to RoomRadar."}
          </h1>
          <p className="mt-4 max-w-lg text-base font-medium leading-7 text-slate-600">
            Add your name, email, password and mobile number. Tick owner mode when you want to list
            rooms and show List Your Room in the navbar.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoPill title="Room seekers" body="Save rooms and contact owners directly." />
            <InfoPill title="Room owners" body="Login as owner and post available rooms." />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-normal">
                {isSignup ? "Sign up" : "Login"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {isSignup ? "Create a new profile." : "Use your saved account details."}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <UserRound className="size-6" />
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" icon={UserRound}>
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Your name"
                  className="form-input pl-11"
                  required={isSignup}
                />
              </Field>

              <Field label="Mobile number" icon={Phone}>
                <input
                  value={form.mobile}
                  onChange={(event) =>
                    update("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="9876543210"
                  inputMode="numeric"
                  className="form-input pl-11"
                  required
                />
              </Field>
            </div>

            <Field label="Email" icon={Mail}>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@example.com"
                className="form-input pl-11"
                required
              />
            </Field>

            <Field label="Password" icon={Lock}>
              <input
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="Minimum 6 characters"
                className="form-input pl-11"
                minLength={6}
                required
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.isOwner}
                onChange={(event) => update("isOwner", event.target.checked)}
                className="mt-1 size-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-black text-ink">Continue as room owner</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
                  Owner accounts can open List Your Room after login.
                </span>
              </span>
            </label>

            {error && (
              <div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-black text-brand-foreground shadow-lg shadow-brand/25 transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? "Please wait..." : isSignup ? "Create account" : "Login"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-bold text-slate-500">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <Link
              to={isSignup ? "/login" : "/signup"}
              className="font-black text-brand hover:text-brand/80"
            >
              {isSignup ? "Login" : "Create account"}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        {children}
      </span>
    </label>
  );
}

function InfoPill({ title, body }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-ink">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{body}</p>
    </div>
  );
}
