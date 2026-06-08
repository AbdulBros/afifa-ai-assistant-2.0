import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";

export type Chip = { id: string; label: string };

type Props = {
  items: Chip[];
  value: string;
  onChange: (id: string) => void;
  testID?: string;
};

export function ChipRow({ items, value, onChange, testID }: Props) {
  const { tokens } = useTheme();
  return (
    <View style={styles.row} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {items.map((c) => {
          const active = c.id === value;
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id)}
              testID={`chip-${c.id}`}
              style={[
                styles.chip,
                {
                  borderColor: active ? tokens.primary : tokens.border,
                  backgroundColor: active ? tokens.primary + "22" : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color: active ? tokens.primary : tokens.textDim,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    justifyContent: "center",
  },
  content: {
    gap: 8,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
