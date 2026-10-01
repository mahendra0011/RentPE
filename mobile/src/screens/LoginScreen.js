import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ApiService } from "../services/api";
import { COLORS } from "../theme";
import { Building2 } from "lucide-react-native";

export default function LoginScreen({ navigation }) {
  // activeTab: login | signup | forgot | reset
  const [activeTab, setActiveTab] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    isOwner: false });
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resetSession, setResetSession] = useState({ email: "", resetToken: "" });
  const [formError, setFormError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = activeTab === "signup";
  const isForgot = activeTab === "forgot";
  const isReset = activeTab === "reset";
  const normalizedEmail = form.email.trim().toLowerCase();
  const otpReady = isSignup && otpEmail && otpEmail === normalizedEmail;
  const resetOtpReady = isForgot && otpEmail && otpEmail === normalizedEmail;

  const submitLabel = loading
    ? "Please wait..."
    : isReset
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

  function update(key, value) {
    setForm((cur) => ({ ...cur, [key]: value }));
    setFormError("");
    setSuccessNotice("");
    if ((isSignup || isForgot) && (key === "email" || key === "isOwner")) {
      setOtp("");
      setOtpEmail("");
      setDevOtp("");
    }
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setFormError("");
    setSuccessNotice("");
    setDevOtp("");
    // keep email/password but clear otp states when leaving tab
    if (tab !== "signup" && tab !== "forgot") {
      setOtp("");
      setOtpEmail("");
    }
  }

  async function sendSignupOtp() {
    if (!normalizedEmail) {
      setFormError("Email is required.");
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      const data = await ApiService.requestOtp({
        email: normalizedEmail,
        isOwner: form.isOwner,
        purpose: "signup" });
      setOtpEmail(normalizedEmail);
      setDevOtp(data?.devOtp || "");
      setSuccessNotice(`OTP sent to ${normalizedEmail}.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send OTP.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendResetOtp() {
    if (!normalizedEmail) {
      setFormError("Email is required.");
      return;
    }
    setLoading(true);
    setFormError("");
    setResetSession({ email: "", resetToken: "" });
    try {
      const data = await ApiService.requestOtp({
        email: normalizedEmail,
        isOwner: false,
        purpose: "reset" });
      setOtpEmail(normalizedEmail);
      setDevOtp(data?.devOtp || "");
      setSuccessNotice(`Reset OTP sent to ${normalizedEmail}.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send reset OTP.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDemoFill(type) {
    if (type === "admin") {
      update("email", "admin@rentpe.demo");
      update("password", "admin123");
    } else if (type === "owner") {
      update("email", "owner@rentpe.demo");
      update("password", "owner123");
      // ensure owner mode for owner demo
      setForm((cur) => ({ ...cur, email: "owner@rentpe.demo", password: "owner123", isOwner: true }));
    } else {
      update("email", "user@rentpe.demo");
      update("password", "user123");
      setForm((cur) => ({ ...cur, email: "user@rentpe.demo", password: "user123", isOwner: false }));
    }
    setActiveTab("login");
    setFormError("");
  }

  async function handleSubmit() {
    setFormError("");
    setSuccessNotice("");

    try {
      // Reset password final step
      if (isReset) {
        if (!resetSession?.email || !resetSession?.resetToken) {
          setFormError("Reset session expired. Please request a new OTP.");
          return;
        }
        if (form.password !== form.confirmPassword) {
          setFormError("New password and confirm password must match.");
          return;
        }
        if (form.password.length < 6) {
          setFormError("Password must be at least 6 characters.");
          return;
        }
        setLoading(true);
        await ApiService.resetPassword({
          email: resetSession.email,
          resetToken: resetSession.resetToken,
          password: form.password });
        setResetSession({ email: "", resetToken: "" });
        setOtp("");
        setOtpEmail("");
        setActiveTab("login");
        setSuccessNotice("Password reset successfully. Please login.");
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

      if (isForgot && resetOtpReady) {
        if (!otp || otp.length !== 6) {
          setFormError("Enter 6 digit OTP.");
          return;
        }
        setLoading(true);
        const verified = await ApiService.verifyResetOtp({ email: normalizedEmail, otp });
        const next = {
          email: verified.email || normalizedEmail,
          resetToken: verified.resetToken };
        setResetSession(next);
        setActiveTab("reset");
        setForm((cur) => ({ ...cur, email: next.email, password: "", confirmPassword: "" }));
        setOtp("");
        setSuccessNotice(`OTP verified for ${next.email}. Set new password.`);
        return;
      }

      // Normal auth: login or signup with OTP
      setLoading(true);
      let result;
      if (isSignup) {
        if (!form.name.trim() || !form.mobile.trim()) {
          setFormError("Name and mobile are required.");
          return;
        }
        if (otp.length !== 6) {
          setFormError("Enter 6 digit OTP.");
          return;
        }
        result = await ApiService.signupWithOtp({
          name: form.name.trim(),
          email: normalizedEmail,
          mobile: form.mobile.trim(),
          password: form.password,
          isOwner: form.isOwner,
          otp });
      } else {
        // login
        if (!normalizedEmail || !form.password) {
          setFormError("Email and password are required.");
          return;
        }
        result = await ApiService.loginWithOwner({
          email: normalizedEmail,
          password: form.password,
          isOwner: form.isOwner });
      }

      const role = result?.user?.role;
      // navigate per role like website: owner -> ListRoom else home
      if (role === "owner") {
        navigation.replace("MyListings");
      } else {
        navigation.replace("MainTabs");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Request failed.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleGooglePlaceholder() {
    setFormError("Google login is not configured. Add VITE_GOOGLE_CLIENT_ID. (Mobile placeholder)");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header branding */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>360°</Text>
            </View>
            <Text style={styles.brandTitle}>RoomsFind</Text>
            <Text style={styles.subtitle}>Verified Owners & Zero Brokerage</Text>
            <Text style={styles.description}>
              Connect with verified owners, schedule visits, and rent hassle-free.
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "login" && styles.tabBtnActive]}
              onPress={() => switchTab("login")}
            >
              <Text style={[styles.tabText, activeTab === "login" && styles.tabTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "signup" && styles.tabBtnActive]}
              onPress={() => switchTab("signup")}
            >
              <Text style={[styles.tabText, activeTab === "signup" && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "forgot" && styles.tabBtnActive]}
              onPress={() => switchTab("forgot")}
            >
              <Text style={[styles.tabText, activeTab === "forgot" && styles.tabTextActive]}>Forgot</Text>
            </TouchableOpacity>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>
                  {isReset ? "New password" : isForgot ? "Forgot password" : isSignup ? "Sign up" : "Login"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isForgot
                    ? "We will email an OTP before opening the reset page."
                    : isReset
                      ? "Enter and confirm your new password."
                      : isSignup
                        ? "We will email an OTP before creating your account."
                        : "Email, password, and owner mode only."}
                </Text>
              </View>
              <View style={styles.userIconWrap}>
                <Text style={{ color: COLORS.brand, fontSize: 18, fontWeight: "900" }}>◯</Text>
              </View>
            </View>

            {/* Signup extra fields */}
            {isSignup && (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor={COLORS.muted}
                    value={form.name}
                    onChangeText={(v) => update("name", v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Mobile number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9876543210"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onChangeText={(v) => update("mobile", v.replace(/\D/g, "").slice(0, 10))}
                  />
                </View>
              </View>
            )}

            {/* Email (hidden for reset) */}
            {!isReset && (
              <>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(v) => update("email", v)}
                />
              </>
            )}

            {/* Reset session banner */}
            {isReset && (
              <View
                style={[
                  styles.banner,
                  resetSession?.resetToken ? styles.bannerSuccess : styles.bannerWarn,
                ]}
              >
                {resetSession?.resetToken ? (
                  <Text style={styles.bannerTextSuccess}>OTP verified for {resetSession.email}.</Text>
                ) : (
                  <Text style={styles.bannerTextWarn}>
                    Reset session expired.{" "}
                    <Text style={{ color: COLORS.brand, fontWeight: "900" }} onPress={() => switchTab("forgot")}>
                      Verify email again
                    </Text>
                  </Text>
                )}
              </View>
            )}

            {/* Password fields */}
            {!isForgot && (
              <>
                <Text style={styles.inputLabel}>{isReset ? "New password" : "Password"}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry
                  value={form.password}
                  onChangeText={(v) => update("password", v)}
                />
              </>
            )}

            {isReset && (
              <>
                <Text style={styles.inputLabel}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry
                  value={form.confirmPassword}
                  onChangeText={(v) => update("confirmPassword", v)}
                />
              </>
            )}

            {/* Owner toggle (not for forgot/reset) */}
            {!isForgot && !isReset && (
              <TouchableOpacity
                style={styles.ownerRow}
                onPress={() => update("isOwner", !form.isOwner)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, form.isOwner && styles.checkboxActive]}>
                  {form.isOwner && <Text style={styles.checkTick}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ownerTitle}>Continue as room owner</Text>
                  <Text style={styles.ownerSub}>
                    {isSignup
                      ? "Owner accounts show List Your Room after OTP verification."
                      : "Tick this only when logging in as a room owner."}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Google placeholder - pill border #4285f4 per website */}
            {!isForgot && !isReset && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity style={styles.googlePill} onPress={handleGooglePlaceholder}>
                  <View style={styles.googleG}>
                    <Text style={{ color: "#4285f4", fontWeight: "900", fontSize: 13 }}>G</Text>
                  </View>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* OTP field */}
            {(otpReady || resetOtpReady) && (
              <>
                <Text style={styles.inputLabel}>Email OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6 digit code"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                />
              </>
            )}

            {(isSignup && otpReady) || (isForgot && resetOtpReady) ? (
              <View style={styles.bannerSuccess}>
                <Text style={styles.bannerTextSuccess}>OTP sent to {otpEmail}.</Text>
                <TouchableOpacity onPress={isForgot ? sendResetOtp : sendSignupOtp} disabled={loading}>
                  <Text style={{ color: COLORS.brand, fontWeight: "900", fontSize: 12, marginTop: 4 }}>
                    Resend code
                  </Text>
                </TouchableOpacity>
                {devOtp ? (
                  <Text style={{ color: "#047857", fontSize: 11, fontWeight: "700", marginTop: 6 }}>
                    Development OTP: {devOtp}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {successNotice ? (
              <View style={styles.bannerSuccess}>
                <Text style={styles.bannerTextSuccess}>{successNotice}</Text>
                {devOtp && !otpReady && !resetOtpReady ? (
                  <Text style={{ color: "#047857", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                    Development OTP: {devOtp}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>{submitLabel}</Text>
                  <Text style={styles.submitArrow}> →</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Demo quick logins - only on login tab per website */}
            {!isSignup && !isForgot && !isReset && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Demo quick login</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.demoGrid}>
                  <TouchableOpacity style={[styles.demoPill, styles.demoAdmin]} onPress={() => handleDemoFill("admin")}>
                    <Text style={[styles.demoPillText, { color: "#7c3aed" }]}> Admin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.demoPill, styles.demoOwner]} onPress={() => handleDemoFill("owner")}>
                    <Text style={[styles.demoPillText, { color: "#2563eb" }]}><Building2 size={12} color="#2563eb" style={{marginRight:4}} />Owner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.demoPill, styles.demoUser]} onPress={() => handleDemoFill("user")}>
                    <Text style={[styles.demoPillText, { color: "#475569" }]}><Text>👤</Text>User</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.bottomLinks}>
              <Text style={styles.bottomText}>
                {isForgot || isReset ? "Remembered it?" : isSignup ? "Already have account?" : "New here?"}{" "}
                <Text
                  style={styles.linkBrand}
                  onPress={() => switchTab(isForgot || isReset || isSignup ? "login" : "signup")}
                >
                  {isForgot || isReset || isSignup ? "Login" : "Create account"}
                </Text>
              </Text>
              {!isSignup && !isForgot && !isReset && (
                <Text style={styles.linkBrand} onPress={() => switchTab("forgot")}>
                  Forgot password?
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.footerNote}>RoomsFind • Verified Owners & Zero Brokerage</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  header: { alignItems: "center", marginBottom: 18 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.brandSoft,
    borderWidth: 2,
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12 },
  iconText: { color: COLORS.brand, fontSize: 18, fontWeight: "900" },
  brandTitle: { color: COLORS.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: {
    color: COLORS.brand,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8 },
  description: { color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 16 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: COLORS.brand },
  tabText: { fontSize: 13, fontWeight: "800", color: "#64748b" },
  tabTextActive: { color: "#fff" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  cardTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "900" },
  cardSubtitle: { color: "#64748b", fontSize: 11, fontWeight: "500", marginTop: 2 },
  userIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center" },
  row2: { flexDirection: "row", gap: 10 },
  inputLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.ink,
    fontSize: 14,
    marginBottom: 2 },
  ownerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1 },
  checkboxActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  checkTick: { color: "#fff", fontSize: 12, fontWeight: "900" },
  ownerTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  ownerSub: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 2, lineHeight: 14 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase" },
  googlePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#4285f4",
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16 },
  googleG: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1 },
  googleText: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  banner: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 10 },
  bannerSuccess: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    padding: 12,
    marginTop: 10 },
  bannerWarn: { borderColor: "#fde68a", backgroundColor: "#fffbeb" },
  bannerTextSuccess: { color: "#065f46", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  bannerTextWarn: { color: "#92400e", fontSize: 12, fontWeight: "700" },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 12,
    marginTop: 10 },
  errorText: { color: "#b91c1c", fontSize: 12, fontWeight: "700" },
  submitBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 14,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  submitArrow: { color: "#fff", fontSize: 14, fontWeight: "900" },
  demoGrid: { flexDirection: "row", gap: 8 },
  demoPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center" },
  demoAdmin: { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" },
  demoOwner: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  demoUser: { backgroundColor: "#f8fafc", borderColor: COLORS.border },
  demoPillText: { fontSize: 12, fontWeight: "900" },
  bottomLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10 },
  bottomText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  linkBrand: { color: COLORS.brand, fontWeight: "900" },
  footerNote: { color: "#94a3b8", fontSize: 11, textAlign: "center", marginTop: 18 } });
