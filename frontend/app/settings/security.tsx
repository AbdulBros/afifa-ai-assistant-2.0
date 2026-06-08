import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Profile } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

// Naive PIN hash. Real builds will replace with a native crypto module.
function naiveHash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `pin_${h}`;
}

export default function SecuritySettings() {
  const { tokens } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [bio, setBio] = useState(profile?.biometric_enabled ?? false);
  const [busy, setBusy] = useState(false);

  const savePin = async () => {
    if (pin.length < 4) {
      toast.show("PIN must be at least 4 digits", "error");
      return;
    }
    setBusy(true);
    try {
      await Profile.update({ pin_hash: naiveHash(pin) });
      await refreshProfile();
      toast.show("PIN saved", "success");
      setPin("");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleBio = async (v: boolean) => {
    setBio(v);
    try {
      await Profile.update({ biometric_enabled: v });
      await refreshProfile();
    } catch {}
  };

  return (
    <Screen title="Security" back testID="settings-security-screen">
      <Text style={[styles.intro, { color: tokens.textDim }]}>
        Lock AFIFA with a PIN or biometrics. Voice authentication preview coming soon.
      </Text>

      <Text style={[styles.section, { color: tokens.textDim }]}>PIN</Text>
      <NeonInput
        label="Set a new PIN"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        testID="security-pin-input"
        placeholder="••••"
      />
      <NeonButton
        label={profile?.pin_hash ? "Update PIN" : "Save PIN"}
        onPress={savePin}
        loading={busy}
        disabled={pin.length < 4}
        testID="security-pin-save"
      />

      <Text style={[styles.section, { color: tokens.textDim }]}>BIOMETRICS</Text>
      <GlassCard style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.lbl, { color: tokens.text }]}>Fingerprint / Face ID</Text>
          <Text style={[styles.sub, { color: tokens.textDim }]}>
            Unlock with your device biometrics (after building APK/IPA).
          </Text>
        </View>
        <Switch
          value={bio}
          onValueChange={toggleBio}
          trackColor={{ true: tokens.primary, false: tokens.surfaceHi }}
          thumbColor="#fff"
          testID="security-biometric"
        />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 1.6, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  lbl: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
});
