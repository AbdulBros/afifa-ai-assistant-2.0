// Calendar & Tasks — simple events + tasks list.

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
import { Calendar } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

type Evt = { event_id: string; title: string; start_at: string; kind: "event" | "task"; done?: boolean; notes?: string };

export default function CalendarTasks() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<Evt[]>([]);
  const [kind, setKind] = useState<"event" | "task">("event");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r: any = await Calendar.list();
      setItems(r.events);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!title.trim()) return toast.show("Title required", "error");
    let startAt: string;
    try {
      startAt = when ? new Date(when).toISOString() : new Date().toISOString();
    } catch {
      return toast.show("Bad date — try ISO 8601 or leave blank", "error");
    }
    setBusy(true);
    try {
      const r: any = await Calendar.create({
        title,
        start_at: startAt,
        kind,
        done: false,
        notes: "",
      });
      setItems((prev) => [r.event, ...prev]);
      setTitle(""); setWhen("");
      toast.show("Saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally { setBusy(false); }
  };

  const toggleDone = async (e: Evt) => {
    try {
      const r: any = await Calendar.update(e.event_id, {
        title: e.title,
        start_at: e.start_at,
        kind: e.kind,
        done: !e.done,
        notes: e.notes ?? "",
      });
      setItems((prev) => prev.map((x) => (x.event_id === e.event_id ? r.event : x)));
    } catch {}
  };

  const remove = async (eid: string) => {
    await Calendar.delete(eid);
    setItems((prev) => prev.filter((e) => e.event_id !== eid));
  };

  return (
    <Screen title="Calendar & Tasks" back testID="calendar-screen">
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow
          items={[
            { id: "event", label: "Events" },
            { id: "task", label: "Tasks" },
          ]}
          value={kind}
          onChange={(v) => setKind(v as any)}
          testID="cal-kind"
        />
      </View>
      <NeonInput label="Title" value={title} onChangeText={setTitle} testID="cal-title" />
      <NeonInput
        label={kind === "event" ? "When (ISO date — optional)" : "Due (ISO — optional)"}
        value={when}
        onChangeText={setWhen}
        placeholder="2026-02-15T14:00"
        testID="cal-when"
      />
      <NeonButton label="Add" onPress={add} loading={busy} testID="cal-add" />

      <Text style={[styles.sec, { color: tokens.textDim, marginTop: 18 }]}>UPCOMING</Text>
      {items.length === 0 ? (
        <Text style={{ color: tokens.textMuted, fontSize: 13 }}>Nothing scheduled.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((e) => (
            <GlassCard key={e.event_id} testID={`cal-${e.event_id}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {e.kind === "task" ? (
                  <Pressable
                    onPress={() => toggleDone(e)}
                    testID={`cal-toggle-${e.event_id}`}
                    style={[
                      styles.check,
                      {
                        borderColor: e.done ? tokens.primary : tokens.border,
                        backgroundColor: e.done ? tokens.primary : "transparent",
                      },
                    ]}
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, {
                    color: tokens.text,
                    textDecorationLine: e.done ? "line-through" : "none",
                  }]}>{e.title}</Text>
                  <Text style={[styles.when, { color: tokens.textDim }]}>
                    {new Date(e.start_at).toLocaleString()}
                  </Text>
                </View>
                <Pressable onPress={() => remove(e.event_id)} testID={`cal-delete-${e.event_id}`}>
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
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5 },
  title: { fontSize: 15, fontWeight: "700" },
  when: { fontSize: 12, marginTop: 2 },
});
