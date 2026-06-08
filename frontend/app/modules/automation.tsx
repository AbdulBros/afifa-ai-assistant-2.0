// Automation Center — rule builder + on-device launch via deep links (Expo Go safe).
// Real OS-level automation (Accessibility Services) activates after APK build.

import { useFocusEffect, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Bot, ChevronDown, Play, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChipRow } from "@/src/components/ChipRow";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Automation } from "@/src/lib/api";
import { AUTOMATION_ACTIONS, AUTOMATION_APPS } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";

type Rule = {
  rule_id: string;
  name: string;
  target_app: string;
  action: string;
  params: Record<string, any>;
  enabled: boolean;
  requires_confirmation: boolean;
};

export default function AutomationCenter() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("whatsapp");
  const [action, setAction] = useState("send_message");
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingRule, setPendingRule] = useState<Rule | null>(null);

  const load = useCallback(async () => {
    try {
      const r: any = await Automation.list();
      setRules(r.rules);
    } catch (e: any) {
      toast.show("Could not load rules", "error");
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const create = async () => {
    if (!name.trim()) {
      toast.show("Give your rule a name", "error");
      return;
    }
    setBusy(true);
    try {
      const r: any = await Automation.create({
        name,
        target_app: target,
        action,
        params: { message, recipient },
        enabled: true,
        requires_confirmation: true,
      });
      setRules((prev) => [r.rule, ...prev]);
      setShowForm(false);
      setName("");
      setMessage("");
      setRecipient("");
      toast.show("Rule saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rid: string) => {
    await Automation.delete(rid);
    setRules((prev) => prev.filter((r) => r.rule_id !== rid));
  };

  const runRule = (r: Rule) => {
    setPendingRule(r);
  };

  const confirmRun = async () => {
    if (!pendingRule) return;
    try {
      await Automation.queue(pendingRule.rule_id);
      // attempt deep link
      const app = AUTOMATION_APPS.find((a) => a.id === pendingRule.target_app);
      const msg = pendingRule.params?.message ?? "";
      const to = pendingRule.params?.recipient ?? "";
      let url: string | null = null;
      if (pendingRule.target_app === "whatsapp") {
        url = `whatsapp://send?phone=${encodeURIComponent(to)}&text=${encodeURIComponent(msg)}`;
      } else if (pendingRule.target_app === "sms") {
        url = `sms:${to}?body=${encodeURIComponent(msg)}`;
      } else if (pendingRule.target_app === "gmail") {
        url = `mailto:${to}?subject=${encodeURIComponent("Hi")}&body=${encodeURIComponent(msg)}`;
      } else if (pendingRule.target_app === "telegram") {
        url = `tg://msg?text=${encodeURIComponent(msg)}`;
      } else if (app) {
        url = app.scheme;
      }
      if (url) {
        try {
          await Linking.openURL(url);
        } catch {
          toast.show("App not installed on this device", "info");
        }
      }
      toast.show("Run queued", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally {
      setPendingRule(null);
    }
  };

  return (
    <Screen title="Automation" back testID="automation-screen">
      <View style={[styles.info, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <Bot size={18} color={tokens.primary} />
        <Text style={[styles.infoTxt, { color: tokens.textDim }]}>
          Build automation rules. Critical actions ask you first. Full on-device automation
          (Accessibility) is unlocked after building the APK.
        </Text>
      </View>

      <NeonButton
        label={showForm ? "Cancel" : "+ New Rule"}
        onPress={() => setShowForm((v) => !v)}
        variant={showForm ? "secondary" : "primary"}
        testID="automation-toggle-form"
      />

      {showForm && (
        <View style={{ marginTop: 16 }}>
          <NeonInput label="Rule name" value={name} onChangeText={setName} placeholder="e.g. Mom WhatsApp ping" testID="rule-name" />
          <Text style={[styles.sec, { color: tokens.textDim }]}>TARGET APP</Text>
          <View style={{ marginHorizontal: -20 }}>
            <ChipRow
              items={AUTOMATION_APPS.map((a) => ({ id: a.id, label: a.label }))}
              value={target}
              onChange={setTarget}
              testID="rule-target"
            />
          </View>
          <Text style={[styles.sec, { color: tokens.textDim }]}>ACTION</Text>
          <View style={{ marginHorizontal: -20 }}>
            <ChipRow
              items={AUTOMATION_ACTIONS}
              value={action}
              onChange={setAction}
              testID="rule-action"
            />
          </View>
          <NeonInput
            label="Recipient (optional)"
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Phone, email, @handle"
            testID="rule-recipient"
          />
          <NeonInput
            label="Message / Content"
            value={message}
            onChangeText={setMessage}
            placeholder="Say hi! What's up?"
            multiline
            testID="rule-message"
          />
          <NeonButton label="Save rule" onPress={create} loading={busy} testID="rule-save" />
        </View>
      )}

      <Text style={[styles.sec, { color: tokens.textDim }]}>RULES</Text>
      {rules.length === 0 ? (
        <Text style={{ color: tokens.textMuted, fontSize: 13 }}>No rules yet.</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {rules.map((r) => (
            <GlassCard key={r.rule_id} testID={`rule-${r.rule_id}`}>
              <View style={styles.ruleHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rName, { color: tokens.text }]}>{r.name}</Text>
                  <Text style={[styles.rSub, { color: tokens.textDim }]}>
                    {r.target_app.toUpperCase()} · {r.action}
                  </Text>
                </View>
                <Pressable
                  onPress={() => runRule(r)}
                  testID={`rule-run-${r.rule_id}`}
                  style={[styles.runBtn, { borderColor: tokens.primary }]}
                >
                  <Play size={14} color={tokens.primary} />
                </Pressable>
                <Pressable onPress={() => remove(r.rule_id)} testID={`rule-delete-${r.rule_id}`}>
                  <Trash2 size={16} color={tokens.textMuted} />
                </Pressable>
              </View>
              {r.params?.message ? (
                <Text style={[styles.rMsg, { color: tokens.textDim }]} numberOfLines={2}>
                  “{r.params.message}”
                </Text>
              ) : null}
            </GlassCard>
          ))}
        </View>
      )}

      {pendingRule && (
        <View style={styles.confirmOverlay}>
          <View
            style={[
              styles.confirmBox,
              { backgroundColor: tokens.surfaceHi, borderColor: tokens.border },
            ]}
          >
            <Text style={[styles.cTitle, { color: tokens.text }]}>Confirm action</Text>
            <Text style={[styles.cSub, { color: tokens.textDim }]}>
              Run “{pendingRule.name}” on {pendingRule.target_app}?
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <NeonButton
                label="Cancel"
                variant="secondary"
                onPress={() => setPendingRule(null)}
                fullWidth={false}
                testID="confirm-cancel"
              />
              <NeonButton
                label="Run"
                onPress={confirmRun}
                fullWidth={false}
                testID="confirm-run"
              />
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoTxt: { flex: 1, fontSize: 12, lineHeight: 17 },
  sec: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginTop: 18, marginBottom: 8 },
  ruleHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  rName: { fontSize: 15, fontWeight: "700" },
  rSub: { fontSize: 12, marginTop: 2 },
  rMsg: { fontSize: 13, marginTop: 8, fontStyle: "italic" },
  runBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 100,
  },
  confirmBox: { width: "100%", padding: 20, borderRadius: 18, borderWidth: 1 },
  cTitle: { fontSize: 18, fontWeight: "800" },
  cSub: { marginTop: 6, fontSize: 14, lineHeight: 20 },
});
