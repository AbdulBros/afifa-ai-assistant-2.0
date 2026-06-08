// Shared shell for onboarding screens: top progress dots, content, bottom CTA.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { NeonButton } from "@/src/components/NeonButton";
import { useTheme } from "@/src/theme/ThemeContext";

type Props = {
  step: number;
  total?: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primary: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };
  secondary?: { label: string; onPress: () => void };
  scrollable?: boolean;
  testID?: string;
};

export function OnboardingShell({
  step,
  total = 6,
  title,
  subtitle,
  children,
  primary,
  secondary,
  scrollable = true,
  testID,
}: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const Body = scrollable ? KeyboardAwareScrollView : (View as any);

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.bg, paddingTop: insets.top + 16 }]} testID={testID}>
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i + 1 <= step ? tokens.primary : tokens.border,
                width: i + 1 === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Body
        style={styles.body}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        bottomOffset={120}
      >
        <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: tokens.textDim }]}>{subtitle}</Text>
        ) : null}
        <View style={{ height: 20 }} />
        {children}
      </Body>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <NeonButton
          label={primary.label}
          onPress={primary.onPress}
          loading={primary.loading}
          disabled={primary.disabled}
          variant="primary"
          size="lg"
          testID={`${testID ?? "onb"}-primary`}
        />
        {secondary ? (
          <>
            <View style={{ height: 8 }} />
            <NeonButton
              label={secondary.label}
              onPress={secondary.onPress}
              variant="ghost"
              testID={`${testID ?? "onb"}-secondary`}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  dots: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  dot: { height: 8, borderRadius: 4 },
  body: { flex: 1 },
  title: { fontSize: 30, fontWeight: "800", lineHeight: 36, letterSpacing: -0.4 },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 22 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
});
