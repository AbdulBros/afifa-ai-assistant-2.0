// Coding Assistant: generate / explain / fix / refactor multi-language code.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChipRow } from "@/src/components/ChipRow";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Code } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

const LANGS = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "java", label: "Java" },
  { id: "kotlin", label: "Kotlin" },
  { id: "dart", label: "Flutter (Dart)" },
  { id: "sql", label: "SQL" },
];

const ACTIONS = [
  { id: "generate", label: "Generate" },
  { id: "explain", label: "Explain" },
  { id: "fix", label: "Fix" },
  { id: "refactor", label: "Refactor" },
];

export default function CodingAssistant() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [language, setLanguage] = useState("python");
  const [action, setAction] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (action === "generate" && !prompt.trim()) {
      toast.show("Describe what to build", "error");
      return;
    }
    if (action !== "generate" && !code.trim()) {
      toast.show("Paste code to analyze", "error");
      return;
    }
    setBusy(true);
    setOutput("");
    try {
      const r: any = await Code.run({ language, action, prompt, code });
      setOutput(r.output);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Coding" back testID="coding-screen">
      <Text style={[styles.sec, { color: tokens.textDim }]}>LANGUAGE</Text>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={LANGS} value={language} onChange={setLanguage} testID="coding-langs" />
      </View>

      <Text style={[styles.sec, { color: tokens.textDim }]}>ACTION</Text>
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={ACTIONS} value={action} onChange={setAction} testID="coding-actions" />
      </View>

      <NeonInput
        label={action === "generate" ? "Describe what you need" : "Notes / goal (optional)"}
        value={prompt}
        onChangeText={setPrompt}
        multiline
        testID="coding-prompt"
        placeholder={
          action === "generate"
            ? "e.g. A REST endpoint that uploads a CSV and stores rows."
            : "e.g. Make this faster / simpler."
        }
      />

      {action !== "generate" && (
        <NeonInput
          label="Code"
          value={code}
          onChangeText={setCode}
          multiline
          testID="coding-code"
          placeholder="Paste code here…"
        />
      )}

      <NeonButton label="Run" onPress={run} loading={busy} testID="coding-run" />

      {output ? (
        <GlassCard style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.text, fontSize: 13, lineHeight: 19, fontFamily: "monospace" }} selectable testID="coding-output">
            {output}
          </Text>
        </GlassCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sec: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginBottom: 8 },
});
