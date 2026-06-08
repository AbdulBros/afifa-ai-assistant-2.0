import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Profile } from "@/src/lib/api";
import { MODELS } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";

export default function ModelSettings() {
  const { tokens } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [active, setActive] = useState({
    provider: profile?.model_provider ?? "openai",
    model: profile?.model_name ?? "gpt-5.4",
  });

  const select = async (provider: string, model: string) => {
    setActive({ provider, model });
    try {
      await Profile.update({ model_provider: provider, model_name: model });
      await refreshProfile();
      toast.show("Model updated", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    }
  };

  return (
    <Screen title="AI Model" back testID="settings-model-screen">
      <Text style={[styles.intro, { color: tokens.textDim }]}>
        Pick a default model. Switch any time in the Chat screen.
      </Text>
      <View style={{ gap: 8 }}>
        {MODELS.map((m) => {
          const isActive = m.provider === active.provider && m.model === active.model;
          return (
            <GlassCard
              key={`${m.provider}-${m.model}`}
              onPress={() => select(m.provider, m.model)}
              testID={`model-${m.provider}-${m.model}`}
              active={isActive}
              style={[
                styles.row,
                isActive && { borderColor: tokens.primary },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.lbl, { color: tokens.text }]}>{m.label}</Text>
                <Text style={[styles.sub, { color: tokens.textDim }]}>
                  {m.provider} · {m.model}
                </Text>
              </View>
              {isActive ? (
                <Text style={[styles.tag, { color: tokens.primary }]}>ACTIVE</Text>
              ) : null}
            </GlassCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  lbl: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  tag: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
});
