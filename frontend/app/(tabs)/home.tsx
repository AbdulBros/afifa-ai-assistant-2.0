import { useRouter } from "expo-router";
import {
  Briefcase,
  Code2,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  Settings,
  Wand2,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { Screen } from "@/src/components/Screen";
import { VoiceOrb } from "@/src/components/VoiceOrb";
import { useTheme } from "@/src/theme/ThemeContext";

const QUICK = [
  { id: "voice", label: "Voice", href: "/modules/voice-assistant", Icon: Mic },
  { id: "chat", label: "Chat", href: "/(tabs)/chat", Icon: MessageSquare },
  { id: "jobs", label: "Jobs", href: "/modules/jobs", Icon: Briefcase },
  { id: "coding", label: "Code", href: "/modules/coding", Icon: Code2 },
  { id: "prompts", label: "Prompts", href: "/modules/prompts", Icon: Wand2 },
  { id: "documents", label: "Docs", href: "/modules/documents", Icon: FileText },
  { id: "email", label: "Email", href: "/modules/email", Icon: Mail },
  { id: "settings", label: "Settings", href: "/settings", Icon: Settings },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Hello";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { profile, user } = useAuth();
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userName = profile?.user_name || user?.name?.split(" ")[0] || "Friend";
  const aiName = profile?.ai_name || "Afifa";

  return (
    <Screen testID="home-screen" scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.hello, { color: tokens.textDim }]}>
            {greeting()},
          </Text>
          <Text style={[styles.name, { color: tokens.text }]}>{userName}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.brandMicro, { color: tokens.textMuted }]}>YOUR AI</Text>
          <Text style={[styles.brand, { color: tokens.primary }]}>{aiName}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/modules/voice-assistant")}
        testID="home-voice-orb-press"
        style={styles.orbWrap}
      >
        <VoiceOrb state="idle" size={240} />
        <Text style={[styles.tap, { color: tokens.text }]}>Tap to talk</Text>
        <Text style={[styles.wake, { color: tokens.textDim }]}>or say “Hi {aiName}”</Text>
      </Pressable>

      <Text style={[styles.section, { color: tokens.textDim }]}>QUICK ACCESS</Text>
      <View style={styles.grid}>
        {QUICK.map(({ id, label, href, Icon }) => (
          <GlassCard
            key={id}
            onPress={() => router.push(href as any)}
            style={styles.gridCard}
            testID={`quick-${id}`}
          >
            <View style={[styles.gridIcon, { borderColor: tokens.borderActive }]}>
              <Icon size={20} color={tokens.primary} strokeWidth={1.6} />
            </View>
            <Text style={[styles.gridLbl, { color: tokens.text }]}>{label}</Text>
          </GlassCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  hello: { fontSize: 14, fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  brand: { fontSize: 18, fontWeight: "800", letterSpacing: 1.5 },
  brandMicro: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  orbWrap: {
    alignItems: "center",
    paddingVertical: 32,
    marginVertical: 12,
  },
  tap: { marginTop: 28, fontSize: 18, fontWeight: "700" },
  wake: { marginTop: 4, fontSize: 13 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: {
    width: "47%",
    padding: 14,
    minHeight: 96,
    justifyContent: "space-between",
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gridLbl: { fontSize: 14, fontWeight: "700" },
});
