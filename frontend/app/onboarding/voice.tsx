import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Volume2 } from "lucide-react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { OnboardingShell } from "@/src/components/OnboardingShell";
import { useToast } from "@/src/components/Toast";
import { Profile, Voice } from "@/src/lib/api";
import { VOICES } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";
import { playAudioBase64 } from "@/src/lib/audio";

export default function VoiceSelect() {
  const router = useRouter();
  const toast = useToast();
  const { profile, refreshProfile } = useAuth();
  const { tokens } = useTheme();
  const [voice, setVoice] = useState(profile?.voice_id ?? "alloy");
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const preview = async (vId: string) => {
    setPreviewing(vId);
    try {
      const r = await Voice.tts(`Hi, I'm ${profile?.ai_name ?? "Afifa"}. This is my voice.`, vId);
      await playAudioBase64(r.audio_base64, r.format);
    } catch (e: any) {
      toast.show("Preview unavailable", "error");
    } finally {
      setPreviewing(null);
    }
  };

  const next = async () => {
    setBusy(true);
    try {
      await Profile.update({ voice_id: voice });
      await refreshProfile();
      router.push("/onboarding/permissions");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={4}
      title="Choose a voice"
      subtitle="Tap a voice to preview it. You can change this later."
      primary={{ label: "Continue", onPress: next, loading: busy }}
      testID="onboarding-voice"
    >
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <HorizontalWaveform state={previewing ? "speaking" : "idle"} width={280} height={90} barCount={36} />
      </View>
      <View style={{ gap: 10 }}>
        {VOICES.map((v) => {
          const active = voice === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => setVoice(v.id)}
              testID={`voice-${v.id}`}
              style={[
                styles.card,
                {
                  borderColor: active ? tokens.primary : tokens.border,
                  backgroundColor: active ? tokens.primary + "11" : tokens.surface,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: tokens.text }]}>{v.label}</Text>
                <Text style={[styles.desc, { color: tokens.textDim }]}>{v.description}</Text>
              </View>
              <Pressable
                onPress={() => preview(v.id)}
                testID={`voice-preview-${v.id}`}
                style={[styles.previewBtn, { borderColor: tokens.border }]}
              >
                <Volume2 size={18} color={previewing === v.id ? tokens.primary : tokens.text} />
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  name: { fontSize: 16, fontWeight: "700" },
  desc: { fontSize: 13, marginTop: 2 },
  previewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
