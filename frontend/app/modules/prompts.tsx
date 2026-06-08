// Prompt Studio: generate, save, browse expert prompts.

import { useFocusEffect } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChipRow } from "@/src/components/ChipRow";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Prompts } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

const USE_CASES = [
  { id: "app", label: "App" },
  { id: "website", label: "Website" },
  { id: "game", label: "Game" },
  { id: "book", label: "Book" },
  { id: "marketing", label: "Marketing" },
  { id: "agent", label: "AI Agent" },
  { id: "image", label: "Image" },
];

type Item = { prompt_id: string; title: string; category: string; body: string };

export default function PromptStudio() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [useCase, setUseCase] = useState("app");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("professional");
  const [generated, setGenerated] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r: any = await Prompts.list();
      setItems(r.prompts);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generate = async () => {
    if (!topic.trim()) {
      toast.show("Describe your topic", "error");
      return;
    }
    setBusy(true);
    setGenerated("");
    try {
      const r: any = await Prompts.generate({ use_case: useCase, topic, style });
      setGenerated(r.prompt);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally { setBusy(false); }
  };

  const saveCurrent = async () => {
    if (!generated.trim()) return;
    try {
      const r: any = await Prompts.save({
        title: topic.slice(0, 48),
        category: useCase,
        body: generated,
      });
      setItems((prev) => [r.prompt, ...prev]);
      toast.show("Saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    }
  };

  const remove = async (pid: string) => {
    await Prompts.delete(pid);
    setItems((prev) => prev.filter((p) => p.prompt_id !== pid));
  };

  return (
    <Screen title="Prompt Studio" back testID="prompts-screen">
      <Text style={[styles.sec, { color: tokens.textDim }]}>USE CASE</Text>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={USE_CASES} value={useCase} onChange={setUseCase} testID="prompt-use-case" />
      </View>
      <NeonInput
        label="Topic / what for?"
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Onboarding flow for a fitness app"
        testID="prompt-topic"
      />
      <NeonInput
        label="Style"
        value={style}
        onChangeText={setStyle}
        placeholder="professional, friendly, technical…"
        testID="prompt-style"
      />
      <NeonButton label="Generate prompt" onPress={generate} loading={busy} testID="prompt-generate" />

      {generated ? (
        <View style={{ marginTop: 16 }}>
          <GlassCard>
            <Text style={{ color: tokens.text, fontSize: 14, lineHeight: 20 }} selectable testID="prompt-output">
              {generated}
            </Text>
          </GlassCard>
          <View style={{ height: 8 }} />
          <NeonButton label="Save to library" variant="secondary" onPress={saveCurrent} testID="prompt-save" />
        </View>
      ) : null}

      <Text style={[styles.sec, { color: tokens.textDim, marginTop: 24 }]}>LIBRARY</Text>
      {items.length === 0 ? (
        <Text style={{ color: tokens.textMuted, fontSize: 13 }}>No saved prompts yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((p) => (
            <GlassCard key={p.prompt_id} testID={`prompt-${p.prompt_id}`}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cat, { color: tokens.primary }]}>{p.category.toUpperCase()}</Text>
                  <Text style={[styles.title, { color: tokens.text }]} numberOfLines={1}>{p.title}</Text>
                  <Text style={[styles.body, { color: tokens.textDim }]} numberOfLines={3}>{p.body}</Text>
                </View>
                <Pressable onPress={() => remove(p.prompt_id)} testID={`prompt-delete-${p.prompt_id}`}>
                  <Trash2 size={16} color={tokens.textMuted} />
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sec: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
  cat: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  body: { fontSize: 13, marginTop: 4 },
});
