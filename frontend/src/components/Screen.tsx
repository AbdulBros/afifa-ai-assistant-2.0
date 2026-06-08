// Shared screen scaffolding: header + body. Respects safe area + tab bar height.

import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";

type Props = {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  testID?: string;
  hideTabPadding?: boolean;
};

export function Screen({
  title,
  back,
  right,
  children,
  scroll = true,
  testID,
  hideTabPadding,
}: Props) {
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const tabPad = hideTabPadding ? 16 : 84 + insets.bottom;

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.bg, paddingTop: insets.top }]} testID={testID}>
      <View style={styles.header}>
        {back ? (
          <Pressable
            onPress={() => router.back()}
            testID="screen-back"
            style={[styles.iconBtn, { borderColor: tokens.border }]}
          >
            <ArrowLeft size={20} color={tokens.text} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        {title ? <Text style={[styles.title, { color: tokens.text }]}>{title}</Text> : <View />}
        <View style={{ minWidth: 40, alignItems: "flex-end" }}>{right}</View>
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: tabPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 8 },
});
