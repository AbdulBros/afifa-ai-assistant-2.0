import React from "react";
import { StyleSheet, View, ViewStyle, Pressable } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glow?: boolean;
  onPress?: () => void;
  testID?: string;
  active?: boolean;
};

export function GlassCard({ children, style, glow = false, onPress, testID, active }: Props) {
  const { tokens } = useTheme();
  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: active ? tokens.borderActive : tokens.border,
          shadowColor: glow ? tokens.primary : "transparent",
        },
        glow && styles.glow,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },
  glow: {
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
