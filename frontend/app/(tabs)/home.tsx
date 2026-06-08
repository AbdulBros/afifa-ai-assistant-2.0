// Home dashboard — matches the AFIFA design:
//   "Hi, I'm Afifa" greeting → "How can I assist you today?" subtitle →
//   central horizontal waveform → 4 circular action buttons →
//   "Today Overview" with 3 stat cards.

import { useFocusEffect, useRouter } from "expo-router";
import {
  MessageSquare,
  Grid3x3,
  Mic,
  Brain,
  Calendar as CalendarIcon,
  Bell,
  Users,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { Screen } from "@/src/components/Screen";
import { Calendar, Memory } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

const ACTIONS = [
  { id: "chat", label: "Chat", href: "/(tabs)/chat", Icon: MessageSquare },
  { id: "apps", label: "Apps", href: "/(tabs)/modules", Icon: Grid3x3 },
  { id: "voice", label: "Voice", href: "/modules/voice-assistant", Icon: Mic },
  { id: "memory", label: "Memory", href: "/(tabs)/memory", Icon: Brain },
];

export default function Home() {
  const { profile, user } = useAuth();
  const { tokens } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState({ tasks: 0, reminders: 0, meetings: 0 });

  const loadStats = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([Calendar.list(), Memory.list("task")]);
      const events: any[] = (c as any).events ?? [];
      const reminders = events.filter((e) => e.kind === "task" && !e.done).length;
      const meetings = events.filter((e) => e.kind === "event").length;
      const tasks = (m as any).items?.length ?? 0;
      setStats({ tasks, reminders, meetings });
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const userName = profile?.user_name || user?.name?.split(" ")[0] || "Friend";
  const aiName = profile?.ai_name || "Afifa";

  return (
    <Screen testID="home-screen" scroll>
      <Text style={[styles.hello, { color: tokens.textDim }]}>Welcome back, {userName}</Text>
      <Text style={[styles.greet, { color: tokens.text }]}>Hi, I&apos;m {aiName}</Text>
      <Text style={[styles.subgreet, { color: tokens.textDim }]}>How can I assist you today?</Text>

      <View style={styles.heroWrap}>
        <HorizontalWaveform state="listening" width={340} height={160} barCount={44} />
      </View>

      <View style={styles.actions}>
        {ACTIONS.map(({ id, label, href, Icon }) => (
          <Pressable
            key={id}
            onPress={() => router.push(href as any)}
            testID={`home-action-${id}`}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.surface,
                shadowColor: tokens.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.actionIcon, { borderColor: tokens.borderActive }]}>
              <Icon size={22} color={tokens.primary} strokeWidth={1.6} />
            </View>
            <Text style={[styles.actionLbl, { color: tokens.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { color: tokens.textDim }]}>TODAY OVERVIEW</Text>
      <View style={styles.stats}>
        <StatCard
          n={stats.tasks}
          label="Tasks"
          Icon={Brain}
          onPress={() => router.push("/(tabs)/memory")}
        />
        <StatCard
          n={stats.reminders}
          label="Reminders"
          Icon={Bell}
          onPress={() => router.push("/modules/calendar")}
        />
        <StatCard
          n={stats.meetings}
          label="Meetings"
          Icon={Users}
          onPress={() => router.push("/modules/calendar")}
        />
      </View>
    </Screen>
  );
}

function StatCard({
  n,
  label,
  Icon,
  onPress,
}: {
  n: number;
  label: string;
  Icon: any;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <GlassCard onPress={onPress} style={styles.stat} testID={`home-stat-${label.toLowerCase()}`}>
      <Icon size={18} color={tokens.primary} strokeWidth={1.6} />
      <Text style={[styles.statN, { color: tokens.text }]}>{n}</Text>
      <Text style={[styles.statLbl, { color: tokens.textDim }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  hello: { fontSize: 12, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase" },
  greet: { fontSize: 30, fontWeight: "800", marginTop: 4, letterSpacing: -0.4 },
  subgreet: { fontSize: 14, marginTop: 4 },
  heroWrap: {
    alignItems: "center",
    paddingVertical: 28,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLbl: { fontSize: 13, fontWeight: "700" },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 28,
    marginBottom: 12,
  },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, alignItems: "flex-start", padding: 14, gap: 6 },
  statN: { fontSize: 26, fontWeight: "800", marginTop: 4 },
  statLbl: { fontSize: 12, fontWeight: "600" },
});
