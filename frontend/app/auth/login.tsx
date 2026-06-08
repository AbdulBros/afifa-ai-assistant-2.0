import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/AuthContext";
import { NeonButton } from "@/src/components/NeonButton";
import { useToast } from "@/src/components/Toast";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { useTheme } from "@/src/theme/ThemeContext";

export default function LoginScreen() {
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);

  const handleGoogle = async () => {
    setBusy("google");
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (e: any) {
      toast.show(e?.message ?? "Sign-in failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleGuest = async () => {
    setBusy("guest");
    try {
      await signInAsGuest("Friend");
      router.replace("/");
    } catch (e: any) {
      toast.show(e?.message ?? "Could not start guest mode", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.bg, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]} testID="login-screen">
      <View style={styles.top}>
        <HorizontalWaveform state="listening" width={280} height={110} />
        <Text style={[styles.brand, { color: tokens.text }]}>AFIFA</Text>
        <Text style={[styles.tag, { color: tokens.primary }]}>
          Your Voice. Your Command. Your World.
        </Text>
      </View>

      <View style={styles.actions}>
        <Text style={[styles.headline, { color: tokens.text }]}>
          Meet your personal AI partner.
        </Text>
        <Text style={[styles.sub, { color: tokens.textDim }]}>
          Chat, automate, code, hunt jobs, draft documents, and remember everything.
        </Text>

        <View style={{ height: 28 }} />

        <NeonButton
          label={busy === "google" ? "Opening Google…" : "Continue with Google"}
          onPress={handleGoogle}
          loading={busy === "google"}
          variant="primary"
          testID="login-google-button"
          size="lg"
        />
        <View style={{ height: 12 }} />
        <NeonButton
          label="Continue as Guest"
          onPress={handleGuest}
          loading={busy === "guest"}
          variant="secondary"
          testID="login-guest-button"
          size="lg"
        />
        <Text style={[styles.legal, { color: tokens.textMuted }]}>
          By continuing, you agree to our Terms & Privacy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  top: {
    alignItems: "center",
    marginTop: 24,
  },
  brand: {
    marginTop: 24,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 10,
  },
  tag: {
    marginTop: 8,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  actions: {
    width: "100%",
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  sub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  legal: {
    marginTop: 16,
    fontSize: 11,
    textAlign: "center",
  },
});
