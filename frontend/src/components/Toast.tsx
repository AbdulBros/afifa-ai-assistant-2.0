// Toast system. Mounted at the root so it never gets clipped by tab bars or modals.

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; message: string };

type ToastContextValue = {
  show: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.viewport, { top: insets.top + 12 }]}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} tokens={tokens} />
      ))}
    </View>
  );
}

function ToastItem({ toast, tokens }: { toast: Toast; tokens: any }) {
  const anim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }, 2400);
    return () => clearTimeout(t);
  }, [anim]);

  const bg =
    toast.kind === "error" ? tokens.danger : toast.kind === "success" ? tokens.success : tokens.surfaceHi;
  const color = toast.kind === "info" ? tokens.text : "#000";

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          borderColor: tokens.border,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
          ],
        },
      ]}
    >
      <Text style={{ color, fontWeight: "600", fontSize: 14 }}>{toast.message}</Text>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
    alignItems: "center",
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: "100%",
  },
});
