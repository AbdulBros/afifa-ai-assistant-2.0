import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { NeonInput } from "@/src/components/NeonInput";
import { OnboardingShell } from "@/src/components/OnboardingShell";
import { useToast } from "@/src/components/Toast";
import { AI_NAME_SUGGESTIONS } from "@/src/lib/catalog";
import { Profile } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

export default function AIName() {
  const router = useRouter();
  const toast = useToast();
  const { profile, refreshProfile } = useAuth();
  const { tokens } = useTheme();
  const [name, setName] = useState(profile?.ai_name ?? "Afifa");
  const [busy, setBusy] = useState(false);

  const next = async () => {
    if (!name.trim()) {
      toast.show("Pick a name", "error");
      return;
    }
    setBusy(true);
    try {
      await Profile.update({ ai_name: name.trim() });
      await refreshProfile();
      router.push("/onboarding/voice");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      title="Name your assistant"
      subtitle={`This name becomes your wake word. Hi ${name.trim() || "Afifa"} — that's how you'll call me.`}
      primary={{ label: "Continue", onPress: next, loading: busy, disabled: !name.trim() }}
      testID="onboarding-ai-name"
    >
      <NeonInput
        label="Assistant name"
        placeholder="Afifa"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        testID="onboarding-ai-name-input"
      />
      <Text style={[styles.lbl, { color: tokens.textDim }]}>SUGGESTIONS</Text>
      <View style={styles.row}>
        {AI_NAME_SUGGESTIONS.map((s) => {
          const active = s.toLowerCase() === name.toLowerCase();
          return (
            <Pressable
              key={s}
              onPress={() => setName(s)}
              testID={`ai-name-suggestion-${s.toLowerCase()}`}
              style={[
                styles.chip,
                {
                  borderColor: active ? tokens.primary : tokens.border,
                  backgroundColor: active ? tokens.primary + "22" : "transparent",
                },
              ]}
            >
              <Text style={{ color: active ? tokens.primary : tokens.text, fontWeight: "600" }}>{s}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.preview, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <Text style={[styles.previewLabel, { color: tokens.textDim }]}>WAKE WORD</Text>
        <Text style={[styles.previewText, { color: tokens.primary }]}>
          “Hi {name.trim() || "Afifa"}”
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  lbl: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginTop: 8, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  preview: {
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  previewLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginBottom: 6 },
  previewText: { fontSize: 22, fontWeight: "800" },
});
