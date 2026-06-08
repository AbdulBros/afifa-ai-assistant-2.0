import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  testID?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
};

export function NeonButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  testID,
  fullWidth = true,
  size = "md",
}: Props) {
  const { tokens } = useTheme();

  const stylesByVariant: Record<Variant, { bg: string; color: string; border: string }> = {
    primary: { bg: tokens.primary, color: "#000", border: tokens.primary },
    secondary: { bg: "rgba(255,255,255,0.08)", color: tokens.text, border: tokens.border },
    ghost: { bg: "transparent", color: tokens.text, border: "transparent" },
    danger: { bg: tokens.danger, color: "#fff", border: tokens.danger },
  };

  const sizeMap = {
    sm: { py: 10, fs: 13, px: 16 },
    md: { py: 14, fs: 15, px: 20 },
    lg: { py: 18, fs: 17, px: 24 },
  } as const;
  const sz = sizeMap[size];

  const v = stylesByVariant[variant];
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          paddingVertical: sz.py,
          paddingHorizontal: sz.px,
          alignSelf: fullWidth ? "stretch" : "auto",
          shadowColor: variant === "primary" ? tokens.primary : "transparent",
        },
        variant === "primary" && styles.glow,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, { color: v.color, fontSize: sz.fs, marginLeft: icon ? 8 : 0 }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
