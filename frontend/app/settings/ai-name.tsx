import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Profile } from "@/src/lib/api";
import { AI_NAME_SUGGESTIONS } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";

export default function AINameSettings() {
  const { tokens } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.ai_name ?? "Afifa");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await Profile.update({ ai_name: name.trim() });
      await refreshProfile();
      toast.show("Updated", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Assistant Name" back testID="settings-ai-name-screen">
      <Text style={[styles.intro, { color: tokens.textDim }]}>
        {`The name you set here becomes your AI's name and wake word.`}
      </Text>
      <NeonInput
        label="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        testID="ai-name-input"
      />
      <Text style={[styles.lbl, { color: tokens.textDim }]}>SUGGESTIONS</Text>
      <View style={styles.row}>
        {AI_NAME_SUGGESTIONS.map((s) => {
          const active = s.toLowerCase() === name.toLowerCase();
          return (
            <Pressable
              key={s}
              onPress={() => setName(s)}
              testID={`ai-name-${s.toLowerCase()}`}
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
      <View
        style={[
          styles.preview,
          { borderColor: tokens.border, backgroundColor: tokens.surface },
        ]}
      >
        <Text style={[styles.previewLbl, { color: tokens.textDim }]}>WAKE WORD</Text>
        <Text style={[styles.previewText, { color: tokens.primary }]}>
          {`"Hi ${name.trim() || "Afifa"}"`}
        </Text>
      </View>
      <View style={{ height: 16 }} />
      <NeonButton label="Save" onPress={save} loading={busy} testID="ai-name-save" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, marginBottom: 16, lineHeight: 19 },
  lbl: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginTop: 8, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  preview: {
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  previewLbl: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginBottom: 6 },
  previewText: { fontSize: 22, fontWeight: "800" },
});
