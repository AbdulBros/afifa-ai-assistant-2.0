import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { MODULES } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";

export default function ModulesTab() {
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <Screen title="All Capabilities" testID="modules-screen">
      <Text style={[styles.intro, { color: tokens.textDim }]}>
        12 modules — every one a tap away.
      </Text>
      <View style={styles.grid}>
        {MODULES.map((m) => (
          <GlassCard
            key={m.id}
            onPress={() => router.push(m.href as any)}
            style={styles.card}
            testID={`module-${m.id}`}
          >
            <View style={[styles.iconBox, { borderColor: tokens.borderActive }]}>
              <m.Icon size={22} color={tokens.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.label, { color: tokens.text }]}>{m.label}</Text>
            <Text style={[styles.blurb, { color: tokens.textDim }]} numberOfLines={2}>
              {m.blurb}
            </Text>
          </GlassCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    padding: 16,
    minHeight: 132,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  label: { fontSize: 15, fontWeight: "800" },
  blurb: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
