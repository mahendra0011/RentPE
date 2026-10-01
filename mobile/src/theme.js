/**
 * RoomsFind theme – mirrors website src/styles.css variables
 * Light theme is default (same as website). Dark overridden only if needed.
 * Brand = oklch(0.52 0.22 280) ≈ #7c3aed (favicon), site header bg-brand
 */
export const COLORS = {
  background: "#f8fafc", // --background oklch(0.985 0.005 247)
  foreground: "#0f172a", // --foreground oklch(0.16 0.04 257)
  card: "#ffffff", // --card
  cardForeground: "#0f172a",
  brand: "#7c3aed", // --brand
  brandSoft: "#ede9fe", // --brand-soft
  brandForeground: "#ffffff",
  ink: "#0f172a", // --ink
  border: "#e2e8f0", // --border
  input: "#e2e8f0",
  muted: "#64748b",
  mutedSoft: "#f1f5f9",
  success: "#059669", // --success (website green)
  successSoft: "#ecfdf5",
  // legacy dark fallbacks (avoid #090d16)
  darkBg: "#090d16"
};

export const FONTS = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  bold: "Inter_700Bold",
  black: "Inter_900Black",
};

export const SHADOW = {
  card: "0 16px 38px -18px rgba(15,23,42,0.12)"
};
