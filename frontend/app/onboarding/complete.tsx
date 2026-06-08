import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { OnboardingShell } from "@/src/components/OnboardingShell";
import { useToast } from "@/src/components/Toast";
import { Profile } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

export default function Complete() {
  const router = useRouter();
  const toast = useToast();
  const { profile, refreshProfile } = useAuth();
  const { tokens } = useTheme();
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      await Profile.update({ onboarding_complete: true });
      await refreshProfile();
      router.replace("/(tabs)/home");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const aiName = profile?.ai_name ?? "Afifa";

  return (
    <OnboardingShell
      step={6}
      title="You're all set"
      subtitle={`${aiName} is ready. Try saying or typing anything — your AI partner is listening.`}
      primary={{ label: `Launch ${aiName}`, onPress: finish, loading: busy }}
      testID="onboarding-complete"
    >
      <View style={styles.center}>
        <HorizontalWaveform state="listening" width={320} height={140} />
        <Text style={[styles.wake, { color: tokens.primary }]}>“Hi {aiName}”</Text>
        <Text style={[styles.note, { color: tokens.textDim }]}>{`That's your wake word.`}</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: 24 },
  wake: { marginTop: 28, fontSize: 26, fontWeight: "800" },
  note: { marginTop: 8, fontSize: 14 },
});
