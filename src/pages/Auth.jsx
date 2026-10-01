import {
  ArrowRight,
  Building2,
  Lock,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import SiteHeader from "@/components/SiteHeader.jsx";
import {
  clearAuthError,
  loginWithGoogle,
  loginUser,
  requestOtp,
  resetPassword,
  signupUser,
  verifyResetOtp,
} from "@/store/authSlice.js";
import authIllustration from "@/assets/auth-illustration.png";

const resetSessionStorageKey = "RentPE:reset-session";
const googleScriptId = "google-identity-services";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { status, error, devOtp } = useSelector((state) => state.auth);
  const isSignup = location.pathname.includes("signup");
  const isForgot = location.pathname.includes("forgot-password");
  const isResetPassword = location.pathname.includes("reset-password");
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ownerFromUrl = query.get("owner") === "1";
  const loginNotice = !isSignup && !isForgot && !isResetPassword ? location.state?.notice : "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    isOwner: ownerFromUrl,
  });
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [resetSession, setResetSession] = useState({});
  const googleButtonRef = useRef(null);
  const googleOwnerModeRef = useRef(ownerFromUrl);
  const loading = status === "loading";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
  const googleLoginAllowed = !isLocalhost || import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === "1";
  const showGoogleLogin = !isForgot && !isResetPassword && googleLoginAllowed;
  const normalizedEmail = form.email.trim().toLowerCase();
  const otpReady = isSignup && otpEmail && otpEmail === normalizedEmail;
  const resetOtpReady = isForgot && otpEmail && otpEmail === normalizedEmail;
  const submitLabel = loading
    ? "Please wait..."
    : isResetPassword
      ? "Update password"
      : isForgot
        ? resetOtpReady
          ? "Verify OTP"
          : "Send reset OTP"
        : isSignup
          ? otpReady
            ? "Verify email & create account"
            : "Send email OTP"
          : "Login";

  useEffect(() => {
    const nextResetSession = isResetPassword
      ? location.state?.resetSession || readResetSession()
      : {};

    if (isResetPassword && nextResetSession?.email && nextResetSession?.resetToken) {
      setResetSession(nextResetSession);
      saveResetSession(nextResetSession);
    } else if (isResetPassword) {
      setResetSession({});
    }

    setForm((current) => ({
      ...current,
      email: isResetPassword ? nextResetSession?.email || "" : current.email,
      password: "",
      confirmPassword: "",
      isOwner: ownerFromUrl,
    }));
    setOtp("");
    setOtpEmail("");
    setFormError("");
    dispatch(clearAuthError());
  }, [dispatch, ownerFromUrl, isSignup, isForgot, isResetPassword, location.state]);

  useEffect(() => {
    googleOwnerModeRef.current = form.isOwner;
  }, [form.isOwner]);

  const handleGoogleCredential = useCallback(
    async (googleResponse) => {
      if (!googleResponse?.credential) {
        setFormError("Google login could not start. Please try again.");
        return;
      }

      setFormError("");

      try {
        const result = await dispatch(
          loginWithGoogle({
            credential: googleResponse.credential,
            isOwner: googleOwnerModeRef.current,
          }),
        ).unwrap();
        navigate(result.user.role === "owner" ? "/list-room" : "/");
      } catch {
        // Redux slice stores the visible error message.
      }
    },
    [dispatch, navigate],
  );

  useEffect(() => {
    if (!showGoogleLogin || !googleClientId) return;

    let cancelled = false;

    function renderGoogleButton() {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: isSignup ? "signup_with" : "signin_with",
        width: Math.min(400, googleButtonRef.current.clientWidth || 320),
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      let script = document.getElementById(googleScriptId);

      if (!script) {
        script = document.createElement("script");
        script.id = googleScriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener("load", renderGoogleButton);
    }

    return () => {
      cancelled = true;
      document.getElementById(googleScriptId)?.removeEventListener("load", renderGoogleButton);
    };
  }, [googleClientId, handleGoogleCredential, isSignup, showGoogleLogin]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");

    if ((isSignup || isForgot) && (key === "email" || key === "isOwner")) {
      setOtp("");
      setOtpEmail("");
    }
  }

  async function sendSignupOtp() {
    await dispatch(
      requestOtp({
        email: normalizedEmail,
        isOwner: form.isOwner,
        purpose: "signup",
      }),
    ).unwrap();
    setOtpEmail(normalizedEmail);
  }

  async function sendResetOtp() {
    clearResetSession();
    setResetSession({});
    await dispatch(
      requestOtp({
        email: normalizedEmail,
        isOwner: false,
        purpose: "reset",
      }),
    ).unwrap();
    setOtpEmail(normalizedEmail);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    try {
      if (isResetPassword) {
        if (!resetSession?.email || !resetSession?.resetToken) {
          setFormError("Reset session expired. Please request a new OTP.");
          return;
        }

        if (form.password !== form.confirmPassword) {
          setFormError("New password and confirm password must match.");
          return;
        }

        await dispatch(
          resetPassword({
            email: resetSession.email,
            resetToken: resetSession.resetToken,
            password: form.password,
          }),
        ).unwrap();
        clearResetSession();
        navigate("/login", {
          replace: true,
          state: { notice: "Password reset successfully. Please login." },
        });
        return;
      }

      if (isSignup && !otpReady) {
        await sendSignupOtp();
        return;
      }

      if (isForgot && !resetOtpReady) {
        await sendResetOtp();
        return;
      }

      if (isForgot) {
        const verified = await dispatch(verifyResetOtp({ email: normalizedEmail, otp })).unwrap();
        const nextResetSession = {
          email: verified.email || normalizedEmail,
          resetToken: verified.resetToken,
        };
        saveResetSession(nextResetSession);
        setResetSession(nextResetSession);
        navigate("/reset-password", { state: { resetSession: nextResetSession } });
        return;
      }

      const result = await dispatch(
        isSignup ? signupUser({ ...form, email: normalizedEmail, otp }) : loginUser(form),
      ).unwrap();
      navigate(result.user.role === "owner" ? "/list-room" : "/");
    } catch {
      // Redux slice stores the visible error message.
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-ink flex flex-col justify-between">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-3 sm:px-6">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          {/* Left Column: 3D Illustration & Branding */}
          <section className="hidden lg:flex flex-col items-center justify-center text-center">
            <div className="relative w-full max-w-[420px]">
              <div className="absolute -inset-4 rounded-3xl bg-brand/5 blur-2xl -z-10" />
              <img
                src={authIllustration}
                alt="RoomsFind Room Search"
                className="mx-auto max-h-[46vh] w-auto max-w-full object-contain drop-shadow-xl select-none transition-transform duration-300 hover:scale-[1.02]"
              />
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-black uppercase tracking-wide text-brand">
                  <ShieldCheck className="size-3.5" />
                  Verified Owners & Zero Brokerage
                </span>
                <h2 className="mt-1.5 text-lg font-black tracking-tight text-ink">
                  {isForgot
                    ? "Reset your account password"
                    : isResetPassword
                      ? "Secure your new password"
                      : isSignup
                        ? "Join RoomsFind Community"
                        : "Welcome to RoomsFind"}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Connect with verified owners, schedule visits, and rent hassle-free.
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Compact Auth Card */}
          <section className="w-full max-w-md mx-auto rounded-[24px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black tracking-normal text-ink sm:text-2xl">
                  {isForgot
                    ? "Forgot password"
                    : isResetPassword
                      ? "New password"
                      : isSignup
                        ? "Sign up"
                        : "Login"}
                </h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {isForgot
                    ? "We will email an OTP before opening the reset page."
                    : isResetPassword
                      ? "Enter and confirm your new password."
                      : isSignup
                        ? "We will email an OTP before creating your account."
                        : "Email, password, and owner mode only."}
                </p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <UserRound className="size-5" />
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignup && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" icon={UserRound}>
                    <input
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                      placeholder="Your name"
                      className="form-input py-2 pl-10 text-sm"
                      required
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
                      className="form-input py-2 pl-10 text-sm"
                      required
                    />
                  </Field>
                </div>
              )}

              {!isResetPassword && (
                <Field label="Email" icon={Mail}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="you@example.com"
                    className="form-input py-2 pl-10 text-sm"
                    required
                  />
                </Field>
              )}

              {isResetPassword && (
                <div
                  className={`rounded-[14px] border p-3 text-xs font-bold leading-5 ${
                    resetSession?.resetToken
                      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                      : "border-amber-100 bg-amber-50 text-amber-800"
                  }`}
                >
                  {resetSession?.resetToken ? (
                    <>OTP verified for {resetSession.email}.</>
                  ) : (
                    <>
                      Reset session expired.{" "}
                      <Link to="/forgot-password" className="font-black text-brand">
                        Verify email again
                      </Link>
                    </>
                  )}
                </div>
              )}

              {!isForgot && (
                <Field label={isResetPassword ? "New password" : "Password"} icon={Lock}>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    placeholder="Minimum 6 characters"
                    className="form-input py-2 pl-10 text-sm"
                    minLength={6}
                    required
                  />
                </Field>
              )}

              {isResetPassword && (
                <Field label="Confirm password" icon={Lock}>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => update("confirmPassword", event.target.value)}
                    placeholder="Re-enter new password"
                    className="form-input py-2 pl-10 text-sm"
                    minLength={6}
                    required
                  />
                </Field>
              )}

              {!isForgot && !isResetPassword && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-slate-200 bg-slate-50 p-2.5">
                  <input
                    type="checkbox"
                    checked={form.isOwner}
                    onChange={(event) => update("isOwner", event.target.checked)}
                    className="mt-0.5 size-4 accent-brand"
                  />
                  <span>
                    <span className="block text-xs font-black text-ink">Continue as room owner</span>
                    <span className="block text-[11px] font-bold leading-4 text-slate-500">
                      {isSignup
                        ? "Owner accounts show List Your Room after OTP verification."
                        : "Tick this only when logging in as a room owner."}
                    </span>
                  </span>
                </label>
              )}

              {showGoogleLogin && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      or
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>

                  {googleClientId ? (
                    <div className="google-login-shell !min-h-10">
                      <div ref={googleButtonRef} className="google-login-button" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setFormError("Google login is not configured. Add VITE_GOOGLE_CLIENT_ID.")
                      }
                      className="google-login-shell !min-h-10 gap-2.5 px-4 text-xs font-black text-ink transition-colors hover:text-[#1a73e8]"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full bg-white font-black text-[#4285f4] shadow-sm ring-1 ring-slate-200 text-xs">
                        G
                      </span>
                      Continue with Google
                    </button>
                  )}
                </div>
              )}

              {(otpReady || resetOtpReady) && (
                <Field label="Email OTP" icon={ShieldCheck}>
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 digit code"
                    inputMode="numeric"
                    className="form-input py-2 pl-10 text-sm"
                    required
                  />
                </Field>
              )}

              {(isSignup && otpReady) || (isForgot && resetOtpReady) ? (
                <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">
                  OTP sent to {otpEmail}.{" "}
                  <button
                    type="button"
                    onClick={isForgot ? sendResetOtp : sendSignupOtp}
                    disabled={loading}
                    className="font-black text-brand disabled:opacity-60"
                  >
                    Resend code
                  </button>
                  {devOtp && (
                    <span className="mt-1 block text-xs text-emerald-700">
                      Development OTP: {devOtp}
                    </span>
                  )}
                </div>
              ) : null}

              {loginNotice && (
                <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">
                  {loginNotice}
                </div>
              )}

              {(formError || error) && (
                <div className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {formError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-black text-brand-foreground shadow-md shadow-brand/20 transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70"
              >
                {submitLabel}
                <ArrowRight className="size-4" />
              </button>

              {!isSignup && !isForgot && !isResetPassword && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Demo quick login
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        update("email", "admin@rentpe.demo");
                        update("password", "admin123");
                      }}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2 text-[11px] font-black text-purple-700 transition-colors hover:bg-purple-100"
                    >
                      <Shield className="size-3" />
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update("email", "owner@rentpe.demo");
                        update("password", "owner123");
                      }}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[11px] font-black text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Building2 className="size-3" />
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update("email", "user@rentpe.demo");
                        update("password", "user123");
                      }}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-600 transition-colors hover:border-brand hover:text-brand"
                    >
                      <UserRound className="size-3" />
                      User
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-3 flex items-center justify-between text-xs font-bold">
              <p className="text-slate-500">
                {isForgot || isResetPassword
                  ? "Remembered it?"
                  : isSignup
                    ? "Already have account?"
                    : "New here?"}{" "}
                <Link
                  to={isForgot || isResetPassword || isSignup ? "/login" : "/signup"}
                  className="font-black text-brand hover:underline"
                >
                  {isForgot || isResetPassword || isSignup ? "Login" : "Create account"}
                </Link>
              </p>
              {!isSignup && !isForgot && !isResetPassword && (
                <Link to="/forgot-password" className="text-brand hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function readResetSession() {
  try {
    return JSON.parse(sessionStorage.getItem(resetSessionStorageKey)) || {};
  } catch {
    return {};
  }
}

function saveResetSession(session) {
  sessionStorage.setItem(resetSessionStorageKey, JSON.stringify(session));
}

function clearResetSession() {
  sessionStorage.removeItem(resetSessionStorageKey);
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
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
