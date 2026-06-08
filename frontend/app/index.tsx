// Router gate. Splash → auth → onboarding → main tabs.

import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/AuthContext";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { useTheme } from "@/src/theme/ThemeContext";

export default function Index() {
  const { loading, user, profile } = useAuth();
  const { tokens } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (!profile?.onboarding_complete) {
      router.replace("/onboarding/welcome");
      return;
    }
    router.replace("/(tabs)/home");
  }, [loading, user, profile, router]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg, paddingTop: insets.top }]} testID="splash-screen">
      <View style={styles.content}>
        <HorizontalWaveform state="listening" width={300} height={120} />
        <Text style={[styles.brand, { color: tokens.text }]}>AFIFA</Text>
        <Text style={[styles.tag, { color: tokens.textDim }]}>
          Your Voice. Your Command. Your World.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center" },
  brand: {
    marginTop: 36,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 12,
  },
  tag: {
    marginTop: 8,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});
