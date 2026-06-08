import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Profile } from "@/src/lib/api";
import { LANGUAGES } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";

export default function LanguageSettings() {
  const { tokens } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState(profile?.language ?? "en");

  const set = async (id: string) => {
    setActive(id);
    try {
      await Profile.update({ language: id });
      await refreshProfile();
      toast.show("Language saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    }
  };

  return (
    <Screen title="Language" back testID="settings-language-screen">
      <Text style={[styles.intro, { color: tokens.textDim }]}>
        AFIFA can chat in many languages. You can mix languages too.
      </Text>
      <View style={{ gap: 8 }}>
        {LANGUAGES.map((l) => {
          const isActive = l.id === active;
          return (
            <GlassCard
              key={l.id}
              onPress={() => set(l.id)}
              testID={`lang-${l.id}`}
              active={isActive}
              style={[styles.row, isActive && { borderColor: tokens.primary }]}
            >
              <Text style={[styles.lbl, { color: tokens.text }]}>{l.label}</Text>
              {isActive ? <Text style={{ color: tokens.primary, fontWeight: "800" }}>✓</Text> : null}
            </GlassCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, justifyContent: "space-between" },
  lbl: { fontSize: 15, fontWeight: "600" },
});
