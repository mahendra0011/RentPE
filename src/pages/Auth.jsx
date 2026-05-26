import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import { clearAuthError, requestOtp, verifyOtp } from "@/store/authSlice.js";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, error, devOtp, otpSent } = useSelector((state) => state.auth);
  const isSignup = location.pathname.includes("signup");
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ownerFromUrl = query.get("owner") === "1";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOwner, setIsOwner] = useState(ownerFromUrl);
  const loading = status === "loading";

  useEffect(() => {
    setIsOwner(ownerFromUrl);
    dispatch(clearAuthError());
  }, [dispatch, ownerFromUrl]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      if (!otpSent) {
        await dispatch(requestOtp({ email, isOwner })).unwrap();
        return;
      }

      const result = await dispatch(verifyOtp({ email, otp, name })).unwrap();
      navigate(result.user.role === "owner" ? "/list-room" : "/search");
    } catch {
      // Redux slice stores the visible error message.
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <SiteHeader />

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-black uppercase tracking-wide text-brand">
            <ShieldCheck className="size-4" />
            Email OTP Login
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl">
            {isSignup ? "Create your RoomRadar account." : "Login to RoomRadar."}
          </h1>
          <p className="mt-4 max-w-lg text-base font-medium leading-7 text-slate-600">
            Use the room owner checkbox when you want to post listings and unlock List Your Room in
            the navbar.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoPill title="No password" body="Secure one-time code on email." />
            <InfoPill title="Owner ready" body="Owner role opens listing tools." />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-normal">
                {otpSent ? "Enter OTP" : isSignup ? "Sign up" : "Login"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {otpSent ? `Code sent to ${email}` : "Continue with your email address."}
              </p>
            </div>
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              {otpSent ? <CheckCircle2 className="size-6" /> : <Mail className="size-6" />}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && !otpSent && (
              <Field label="Name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="form-input"
                />
              </Field>
            )}

            <Field label="Email">
              <input
                type="email"
                value={email}
                disabled={otpSent}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="form-input disabled:cursor-not-allowed disabled:opacity-70"
                required
              />
            </Field>

            {!otpSent && (
              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={isOwner}
                  onChange={(event) => setIsOwner(event.target.checked)}
                  className="mt-1 size-4 accent-brand"
                />
                <span>
                  <span className="block text-sm font-black text-ink">Login as room owner</span>
                  <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">
                    Checked account can post rooms after OTP verification.
                  </span>
                </span>
              </label>
            )}

            {otpSent && (
              <Field label="6 digit OTP">
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="form-input text-center text-2xl font-black tracking-[0.35em]"
                  required
                />
              </Field>
            )}

            {devOtp && (
              <div className="rounded-[18px] border border-brand/20 bg-brand-soft p-4 text-sm font-black text-brand">
                Local OTP: {devOtp}
              </div>
            )}

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
              {loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
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
