import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

import { storage } from "@/src/utils/storage";

import { PRESETS, ThemePresetName, ThemeTokens } from "./tokens";

type ThemeContextValue = {
  preset: ThemePresetName;
  tokens: ThemeTokens;
  setPreset: (p: ThemePresetName) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const KEY = "afifa.theme.preset";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<ThemePresetName>("Blue Neon");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(KEY, "Blue Neon");
      if (saved && saved in PRESETS) setPresetState(saved as ThemePresetName);
      setReady(true);
    })();
  }, []);

  const setPreset = (p: ThemePresetName) => {
    setPresetState(p);
    void storage.setItem(KEY, p);
  };

  const value = useMemo(
    () => ({ preset, tokens: PRESETS[preset], setPreset, ready }),
    [preset, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
