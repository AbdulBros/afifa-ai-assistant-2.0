import { useRouter } from "expo-router";
import { Mic, Bell, Image as ImageIcon, Users, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/src/components/OnboardingShell";
import { useTheme } from "@/src/theme/ThemeContext";

const PERMISSIONS = [
  { Icon: Mic, label: "Microphone", note: "For voice chat and dictation" },
  { Icon: Bell, label: "Notifications", note: "Reminders, job alerts, automation runs" },
  { Icon: ImageIcon, label: "Storage", note: "Save documents, photos for vision" },
  { Icon: Users, label: "Contacts", note: "Optional, for messaging automation" },
  { Icon: ShieldCheck, label: "Accessibility", note: "Optional, required for app automation (Android)" },
];

export default function Permissions() {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <OnboardingShell
      step={5}
      title="Permissions"
      subtitle="AFIFA only asks for what it needs, when it needs it. You'll get prompts later."
      primary={{ label: "Continue", onPress: () => router.push("/onboarding/complete") }}
      testID="onboarding-permissions"
    >
      <View style={{ gap: 10 }}>
        {PERMISSIONS.map(({ Icon, label, note }) => (
          <View key={label} style={[styles.row, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <View style={[styles.iconBox, { borderColor: tokens.borderActive }]}>
              <Icon color={tokens.primary} size={20} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: tokens.text }]}>{label}</Text>
              <Text style={[styles.note, { color: tokens.textDim }]}>{note}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lbl: { fontSize: 15, fontWeight: "700" },
  note: { fontSize: 12, marginTop: 2 },
});
