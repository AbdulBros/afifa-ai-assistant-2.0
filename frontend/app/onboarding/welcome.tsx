import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { OnboardingShell } from "@/src/components/OnboardingShell";
import { useTheme } from "@/src/theme/ThemeContext";

export default function Welcome() {
  const router = useRouter();
  const { tokens } = useTheme();

  return (
    <OnboardingShell
      step={1}
      title="Welcome to AFIFA"
      subtitle="The voice-first AI partner that remembers, automates, and grows with you."
      primary={{ label: "Get started", onPress: () => router.push("/onboarding/user-name") }}
      testID="onboarding-welcome"
    >
      <View style={styles.center}>
        <HorizontalWaveform state="listening" width={320} height={140} />
        <Text style={[styles.tag, { color: tokens.primary }]}>YOUR VOICE · YOUR COMMAND · YOUR WORLD</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  tag: { marginTop: 28, fontSize: 11, letterSpacing: 2.4, fontWeight: "700" },
});
