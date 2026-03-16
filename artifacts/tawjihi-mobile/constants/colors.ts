// Exact match to web app's CSS variables (index.css)
// Primary: hsl(160 84% 39%) = Emerald Green
// Secondary: hsl(45 93% 47%) = Amber/Gold
// Background light: hsl(160 20% 98%) = Mint White
// Background dark: hsl(160 50% 8%) = Dark Teal
export default {
  light: {
    primary: "#10B77F",        // hsl(160 84% 39%)
    primaryFg: "#FFFFFF",
    primaryGlow: "rgba(16,183,127,0.15)",
    secondary: "#E7AF08",      // hsl(45 93% 47%)
    secondaryFg: "#0A291D",
    secondaryGlow: "rgba(231,175,8,0.15)",
    success: "#10B77F",
    error: "#EF4444",
    errorGlow: "rgba(239,68,68,0.12)",
    warning: "#F59E0B",
    text: "#0A291D",           // hsl(160 50% 10%)
    textSecondary: "#3D7A60",
    textMuted: "#7EAA96",
    background: "#F5FAF8",     // hsl(160 20% 98%)
    card: "#FFFFFF",
    cardSecondary: "#EDF7F2",
    border: "#D0EAE1",         // hsl(160 20% 88%)
    input: "#D0EAE1",
    tint: "#10B77F",
    tabIconDefault: "#7EAA96",
    tabIconSelected: "#10B77F",
    muted: "#E3F2EC",          // hsl(160 20% 92%)
    mutedForeground: "#4D8470",
  },
  dark: {
    primary: "#1FC48F",        // hsl(160 84% 45%)
    primaryFg: "#071A12",
    primaryGlow: "rgba(31,196,143,0.18)",
    secondary: "#F0BE14",      // hsl(45 93% 55%)
    secondaryFg: "#071A12",
    secondaryGlow: "rgba(240,190,20,0.15)",
    success: "#1FC48F",
    error: "#EF4444",
    errorGlow: "rgba(239,68,68,0.12)",
    warning: "#F59E0B",
    text: "#F5FAF8",           // hsl(160 20% 98%)
    textSecondary: "#8CB8A5",
    textMuted: "#3D6655",
    background: "#071A12",     // hsl(160 50% 8%)
    card: "#0D2019",           // hsl(160 40% 12%)
    cardSecondary: "#122A1F",
    border: "#1A4033",         // hsl(160 40% 20%)
    input: "#1A4033",
    tint: "#1FC48F",
    tabIconDefault: "#3D6655",
    tabIconSelected: "#1FC48F",
    muted: "#162E22",          // hsl(160 40% 20%)
    mutedForeground: "#6FA88E",
  },
};
