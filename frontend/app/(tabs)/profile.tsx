import { useRouter } from "expo-router";
import { ChevronRight, LogOut, Palette, ShieldCheck, Globe, Cpu, User as UserIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { VoiceOrb } from "@/src/components/VoiceOrb";
import { useTheme } from "@/src/theme/ThemeContext";

export default function ProfileTab() {
  const { user, profile, signOut } = useAuth();
  const { tokens } = useTheme();
  const router = useRouter();

  const settingsRows = [
    { id: "theme", label: "Theme & Appearance", Icon: Palette, href: "/settings/theme" },
    { id: "ai-name", label: "Assistant Name & Wake Word", Icon: UserIcon, href: "/settings/ai-name" },
    { id: "model", label: "AI Model Preferences", Icon: Cpu, href: "/settings/model" },
    { id: "language", label: "Language", Icon: Globe, href: "/settings/language" },
    { id: "security", label: "Security", Icon: ShieldCheck, href: "/settings/security" },
  ];

  return (
    <Screen title="Profile" testID="profile-screen" scroll>
      <View style={styles.hero}>
        <VoiceOrb state="idle" size={140} />
        <Text style={[styles.userName, { color: tokens.text }]}>
          {profile?.user_name || user?.name || "Friend"}
        </Text>
        <Text style={[styles.email, { color: tokens.textDim }]}>{user?.email}</Text>
        <View style={[styles.wakePill, { borderColor: tokens.borderActive, backgroundColor: tokens.primary + "11" }]}>
          <Text style={{ color: tokens.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 }}>
            “Hi {profile?.ai_name || "Afifa"}”
          </Text>
        </View>
      </View>

      <Text style={[styles.section, { color: tokens.textDim }]}>SETTINGS</Text>
      <View style={{ gap: 8 }}>
        {settingsRows.map((row) => (
          <GlassCard
            key={row.id}
            onPress={() => router.push(row.href as any)}
            testID={`profile-setting-${row.id}`}
            style={styles.row}
          >
            <View style={[styles.rowIcon, { borderColor: tokens.borderActive }]}>
              <row.Icon size={18} color={tokens.primary} strokeWidth={1.6} />
            </View>
            <Text style={[styles.rowLbl, { color: tokens.text }]}>{row.label}</Text>
            <ChevronRight size={16} color={tokens.textDim} />
          </GlassCard>
        ))}
      </View>

      <Text style={[styles.section, { color: tokens.textDim }]}>ACCOUNT</Text>
      <Pressable
        onPress={async () => {
          await signOut();
          router.replace("/auth/login");
        }}
        testID="profile-logout"
        style={[styles.logout, { borderColor: tokens.danger }]}
      >
        <LogOut size={18} color={tokens.danger} />
        <Text style={{ color: tokens.danger, fontWeight: "700", marginLeft: 8 }}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 16 },
  userName: { fontSize: 22, fontWeight: "800", marginTop: 16 },
  email: { fontSize: 13, marginTop: 4 },
  wakePill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  section: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLbl: { flex: 1, fontSize: 15, fontWeight: "600" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
