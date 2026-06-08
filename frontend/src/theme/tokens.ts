// AFIFA theme system. 6 presets + custom overrides.
// Each preset only overrides the primary accent + glow; the dark base palette
// is shared so swapping a theme is instant and never breaks contrast.

export type ThemePresetName =
  | "Blue Neon"
  | "White Glow"
  | "Purple Cyber"
  | "Green Matrix"
  | "Red Tech"
  | "Gold Premium";

export type ThemeTokens = {
  bg: string;
  surface: string;
  surfaceHi: string;
  border: string;
  borderActive: string;
  text: string;
  textDim: string;
  textMuted: string;
  primary: string;
  primaryGlow: string;
  danger: string;
  success: string;
};

const base = {
  bg: "#050505",
  surface: "rgba(255,255,255,0.04)",
  surfaceHi: "rgba(255,255,255,0.09)",
  border: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  textDim: "#A1A1AA",
  textMuted: "#52525B",
  danger: "#FF4D4F",
  success: "#22C55E",
};

export const PRESETS: Record<ThemePresetName, ThemeTokens> = {
  "Blue Neon": {
    ...base,
    primary: "#00E5FF",
    primaryGlow: "rgba(0,229,255,0.45)",
    borderActive: "rgba(0,229,255,0.35)",
  },
  "White Glow": {
    ...base,
    primary: "#FFFFFF",
    primaryGlow: "rgba(255,255,255,0.35)",
    borderActive: "rgba(255,255,255,0.4)",
  },
  "Purple Cyber": {
    ...base,
    primary: "#B026FF",
    primaryGlow: "rgba(176,38,255,0.45)",
    borderActive: "rgba(176,38,255,0.35)",
  },
  "Green Matrix": {
    ...base,
    primary: "#00FF66",
    primaryGlow: "rgba(0,255,102,0.4)",
    borderActive: "rgba(0,255,102,0.3)",
  },
  "Red Tech": {
    ...base,
    primary: "#FF003C",
    primaryGlow: "rgba(255,0,60,0.4)",
    borderActive: "rgba(255,0,60,0.3)",
  },
  "Gold Premium": {
    ...base,
    primary: "#FFD700",
    primaryGlow: "rgba(255,215,0,0.4)",
    borderActive: "rgba(255,215,0,0.35)",
  },
};

export const FONT_HEAD = "Inter"; // Falls back to system, no bundled fonts in V1
export const FONT_BODY = "Inter";

export const PRESET_NAMES = Object.keys(PRESETS) as ThemePresetName[];
