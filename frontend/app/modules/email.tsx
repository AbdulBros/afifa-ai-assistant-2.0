// Email Assistant: draft, summarize, suggest replies.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChipRow } from "@/src/components/ChipRow";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Email } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

const TABS = [
  { id: "draft", label: "Draft" },
  { id: "summarize", label: "Summarize" },
];

export default function EmailAssistant() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState("draft");

  const [recipient, setRecipient] = useState("");
  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState("professional");
  const [draft, setDraft] = useState("");

  const [emailText, setEmailText] = useState("");
  const [summary, setSummary] = useState("");

  const [busy, setBusy] = useState(false);

  const doDraft = async () => {
    if (!intent.trim()) return toast.show("What's the email about?", "error");
    setBusy(true); setDraft("");
    try {
      const r: any = await Email.draft({ intent, recipient, tone });
      setDraft(r.email);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally { setBusy(false); }
  };

  const doSummarize = async () => {
    if (!emailText.trim()) return toast.show("Paste an email", "error");
    setBusy(true); setSummary("");
    try {
      const r: any = await Email.summarize({ email_text: emailText });
      setSummary(r.summary);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally { setBusy(false); }
  };

  return (
    <Screen title="Email" back testID="email-screen">
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={TABS} value={tab} onChange={setTab} testID="email-tabs" />
      </View>

      {tab === "draft" ? (
        <View>
          <NeonInput label="To (optional)" value={recipient} onChangeText={setRecipient} testID="email-to" />
          <NeonInput label="What do you want to say?" value={intent} onChangeText={setIntent} multiline testID="email-intent" />
          <NeonInput label="Tone" value={tone} onChangeText={setTone} testID="email-tone" placeholder="professional, casual, apologetic…" />
          <NeonButton label="Draft email" onPress={doDraft} loading={busy} testID="email-draft" />
          {draft ? (
            <GlassCard style={{ marginTop: 16 }}>
              <Text style={{ color: tokens.text, fontSize: 14, lineHeight: 20 }} selectable testID="email-output">
                {draft}
              </Text>
            </GlassCard>
          ) : null}
        </View>
      ) : (
        <View>
          <NeonInput label="Paste an email" value={emailText} onChangeText={setEmailText} multiline testID="email-text" />
          <NeonButton label="Summarize & suggest replies" onPress={doSummarize} loading={busy} testID="email-summarize" />
          {summary ? (
            <GlassCard style={{ marginTop: 16 }}>
              <Text style={{ color: tokens.text, fontSize: 14, lineHeight: 20 }} selectable testID="email-summary-output">
                {summary}
              </Text>
            </GlassCard>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
