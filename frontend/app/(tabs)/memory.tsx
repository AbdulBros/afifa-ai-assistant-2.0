import { useFocusEffect } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ChipRow } from "@/src/components/ChipRow";
import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Memory } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "conversation", label: "Chats" },
  { id: "note", label: "Notes" },
  { id: "project", label: "Projects" },
  { id: "task", label: "Tasks" },
  { id: "preference", label: "Preferences" },
];

type Mem = {
  memory_id: string;
  category: string;
  title: string;
  summary: string;
  created_at: string;
};

export default function MemoryTab() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Mem[]>([]);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    try {
      const r: any = await Memory.list(category === "all" ? undefined : category, q || undefined);
      setItems(r.items);
    } catch (e: any) {
      toast.show("Could not load memory", "error");
    }
  }, [category, q, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const addNote = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await Memory.create({ category: "note", title: newTitle.trim(), summary: "" });
      setNewTitle("");
      await load();
      toast.show("Saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await Memory.delete(id);
      setItems((prev) => prev.filter((i) => i.memory_id !== id));
    } catch {}
  };

  return (
    <Screen title="Memory" testID="memory-screen" scroll>
      <View
        style={[
          styles.search,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={load}
          placeholder="Search memories…"
          placeholderTextColor={tokens.textMuted}
          style={{ flex: 1, color: tokens.text, fontSize: 14 }}
          testID="memory-search"
        />
      </View>

      <View style={{ marginHorizontal: -20 }}>
        <ChipRow
          items={CATEGORIES}
          value={category}
          onChange={setCategory}
          testID="memory-categories"
        />
      </View>

      <View
        style={[
          styles.quickAdd,
          { borderColor: tokens.border, backgroundColor: tokens.surface },
        ]}
      >
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Quick add a note…"
          placeholderTextColor={tokens.textMuted}
          style={{ flex: 1, color: tokens.text, fontSize: 14 }}
          testID="memory-new-input"
        />
        <Pressable
          onPress={addNote}
          disabled={busy || !newTitle.trim()}
          testID="memory-new-save"
          style={[
            styles.saveBtn,
            { backgroundColor: newTitle.trim() ? tokens.primary : tokens.surfaceHi },
          ]}
        >
          <Text style={{ color: newTitle.trim() ? "#000" : tokens.textMuted, fontWeight: "700" }}>
            Add
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={[styles.empty, { color: tokens.textDim }]}>
          No memories yet. Start a chat or add a note.
        </Text>
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {items.map((m) => (
            <GlassCard key={m.memory_id} testID={`memory-item-${m.memory_id}`}>
              <View style={styles.memHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cat, { color: tokens.primary }]}>
                    {m.category.toUpperCase()}
                  </Text>
                  <Text style={[styles.title, { color: tokens.text }]} numberOfLines={2}>
                    {m.title}
                  </Text>
                  {m.summary ? (
                    <Text
                      style={[styles.sum, { color: tokens.textDim }]}
                      numberOfLines={3}
                    >
                      {m.summary}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => remove(m.memory_id)}
                  testID={`memory-delete-${m.memory_id}`}
                >
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
  search: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickAdd: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  empty: { marginTop: 28, textAlign: "center" },
  memHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cat: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  sum: { fontSize: 13, marginTop: 4 },
});
