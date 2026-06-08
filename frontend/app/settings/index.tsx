import { useRouter } from "expo-router";
import { ChevronRight, Palette, Cpu, Globe, ShieldCheck, User as UserIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { useTheme } from "@/src/theme/ThemeContext";

const ROWS = [
  { id: "theme", label: "Theme & Appearance", Icon: Palette, href: "/settings/theme" },
  { id: "ai-name", label: "Assistant Name & Wake Word", Icon: UserIcon, href: "/settings/ai-name" },
  { id: "model", label: "AI Model Preferences", Icon: Cpu, href: "/settings/model" },
  { id: "language", label: "Language", Icon: Globe, href: "/settings/language" },
  { id: "security", label: "Security", Icon: ShieldCheck, href: "/settings/security" },
];

export default function SettingsHome() {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <Screen title="Settings" back testID="settings-screen">
      <View style={{ gap: 8 }}>
        {ROWS.map((r) => (
          <GlassCard
            key={r.id}
            onPress={() => router.push(r.href as any)}
            testID={`settings-${r.id}`}
            style={styles.row}
          >
            <View style={[styles.icon, { borderColor: tokens.borderActive }]}>
              <r.Icon size={18} color={tokens.primary} strokeWidth={1.6} />
            </View>
            <Text style={[styles.lbl, { color: tokens.text }]}>{r.label}</Text>
            <ChevronRight size={16} color={tokens.textDim} />
          </GlassCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  icon: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  lbl: { flex: 1, fontSize: 15, fontWeight: "600" },
});
