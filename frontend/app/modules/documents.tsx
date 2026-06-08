// Document Generator: produce resumes, reports, notes, letters, etc.

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
import { Documents } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

const DOC_TYPES = [
  { id: "resume", label: "Resume" },
  { id: "report", label: "Report" },
  { id: "notes", label: "Notes" },
  { id: "letter", label: "Letter" },
  { id: "summary", label: "Summary" },
  { id: "proposal", label: "Proposal" },
];

type Doc = { document_id: string; doc_type: string; topic: string; content: string };

export default function DocumentGenerator() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [docType, setDocType] = useState("resume");
  const [topic, setTopic] = useState("");
  const [extra, setExtra] = useState("");
  const [out, setOut] = useState("");
  const [items, setItems] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r: any = await Documents.list();
      setItems(r.documents);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const gen = async () => {
    if (!topic.trim()) {
      toast.show("Describe the document", "error");
      return;
    }
    setBusy(true);
    setOut("");
    try {
      const r: any = await Documents.generate({
        doc_type: docType,
        topic,
        format: "markdown",
        extra,
      });
      setOut(r.document.content);
      setItems((prev) => [r.document, ...prev]);
      toast.show("Generated", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally { setBusy(false); }
  };

  const remove = async (did: string) => {
    await Documents.delete(did);
    setItems((prev) => prev.filter((d) => d.document_id !== did));
  };

  return (
    <Screen title="Documents" back testID="documents-screen">
      <Text style={[styles.sec, { color: tokens.textDim }]}>TYPE</Text>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={DOC_TYPES} value={docType} onChange={setDocType} testID="doc-types" />
      </View>
      <NeonInput label="What is it about?" value={topic} onChangeText={setTopic} multiline testID="doc-topic" />
      <NeonInput label="Extra details (optional)" value={extra} onChangeText={setExtra} multiline testID="doc-extra" />
      <NeonButton label="Generate" onPress={gen} loading={busy} testID="doc-generate" />

      {out ? (
        <GlassCard style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.text, fontSize: 14, lineHeight: 20 }} selectable testID="doc-output">
            {out}
          </Text>
        </GlassCard>
      ) : null}

      <Text style={[styles.sec, { color: tokens.textDim, marginTop: 24 }]}>RECENT</Text>
      {items.length === 0 ? (
        <Text style={{ color: tokens.textMuted, fontSize: 13 }}>None yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((d) => (
            <GlassCard key={d.document_id} testID={`doc-${d.document_id}`}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tag, { color: tokens.primary }]}>{d.doc_type.toUpperCase()}</Text>
                  <Text style={[styles.title, { color: tokens.text }]} numberOfLines={2}>{d.topic}</Text>
                </View>
                <Pressable onPress={() => remove(d.document_id)} testID={`doc-delete-${d.document_id}`}>
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
  tag: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { fontSize: 14, fontWeight: "700", marginTop: 4 },
});
