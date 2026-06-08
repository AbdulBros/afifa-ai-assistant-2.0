import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { VoiceOrb } from "@/src/components/VoiceOrb";
import { useTheme } from "@/src/theme/ThemeContext";
import { PRESETS, ThemePresetName } from "@/src/theme/tokens";

export default function ThemeSettings() {
  const { tokens, preset, setPreset } = useTheme();
  const names = Object.keys(PRESETS) as ThemePresetName[];

  return (
    <Screen title="Theme" back testID="settings-theme-screen">
      <View style={styles.preview}>
        <VoiceOrb state="listening" size={160} />
        <Text style={[styles.preName, { color: tokens.primary }]}>{preset}</Text>
        <Text style={[styles.preTag, { color: tokens.textDim }]}>Tap a theme to apply instantly</Text>
      </View>

      <View style={styles.row}>
        {names.map((n) => {
          const active = n === preset;
          return (
            <Pressable
              key={n}
              onPress={() => setPreset(n)}
              testID={`theme-${n.toLowerCase().replace(/\s+/g, "-")}`}
              style={[
                styles.swatch,
                {
                  borderColor: active ? PRESETS[n].primary : tokens.border,
                  shadowColor: PRESETS[n].primary,
                },
                active && styles.swatchActive,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: PRESETS[n].primary, shadowColor: PRESETS[n].primary },
                ]}
              />
              <Text style={[styles.swLbl, { color: tokens.text }]}>{n}</Text>
              {active ? (
                <Text style={[styles.active, { color: PRESETS[n].primary }]}>SELECTED</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: "center", paddingVertical: 16, marginBottom: 16 },
  preName: { marginTop: 12, fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  preTag: { marginTop: 4, fontSize: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: {
    width: "47%",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 110,
  },
  swatchActive: {
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  swLbl: { fontSize: 14, fontWeight: "700", marginTop: 12 },
  active: { marginTop: 4, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
});
