// AI Voice Clone — onboarding-style "Let's learn your voice" + training screen.
// V1 records 30 sec of audio and sends the sample to the backend (memory item).
// Real voice-clone training (ElevenLabs) activates when user provides their API key.

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { NeonButton } from "@/src/components/NeonButton";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { VoiceCloneRing } from "@/src/components/VoiceCloneRing";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { Voice, Memory } from "@/src/lib/api";
import { ensureAudioMode } from "@/src/lib/audio";
import { useTheme } from "@/src/theme/ThemeContext";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";

const TARGET_SECONDS = 30;

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const PHRASES = [
  "Hi, this is my voice talking to my assistant.",
  "Today is a great day to build something amazing.",
  "Remember to take a break and drink water.",
  "I love using AFIFA to manage my day.",
  "Let's get to work and accomplish our goals.",
];

export default function VoiceClone() {
  const { tokens } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<"setup" | "recording" | "training" | "ready">("setup");
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phrase, setPhrase] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    ensureAudioMode();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    if (Platform.OS !== "web") {
      const g = await AudioModule.requestRecordingPermissionsAsync();
      if (!g.granted) {
        toast.show("Microphone permission needed", "error");
        return;
      }
    } else {
      toast.show("Recording works on the mobile build", "info");
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setElapsed(0);
      setPhase("recording");
      setPhrase(0);
      timerRef.current = (setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= TARGET_SECONDS) {
            void stop();
            return TARGET_SECONDS;
          }
          if ((e + 1) % 6 === 0) setPhrase((p) => (p + 1) % PHRASES.length);
          return e + 1;
        });
      }, 1000) as unknown) as number;
    } catch {
      toast.show("Could not start recording", "error");
    }
  };

  const stop = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("training");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      // Simulate training progress
      let p = 0;
      const tickId = setInterval(() => {
        p += Math.random() * 0.07;
        if (p >= 1) {
          clearInterval(tickId);
          setProgress(1);
          finalize(uri ?? null);
          return;
        }
        setProgress(Math.min(0.99, p));
      }, 250);
    } catch (e: any) {
      toast.show(e?.message ?? "Recording failed", "error");
      setPhase("setup");
    }
  };

  const finalize = async (uri: string | null) => {
    try {
      // Optional transcription as a sanity check
      let sampleText = "";
      if (uri) {
        try {
          const r = await Voice.transcribe(uri);
          sampleText = r.text;
        } catch {}
      }
      await Memory.create({
        category: "preference",
        title: `Voice clone sample — ${profile?.user_name ?? "User"}`,
        summary: sampleText.slice(0, 200),
        data: { type: "voice_clone_sample", recorded_at: new Date().toISOString() },
      });
      setPhase("ready");
      toast.show("Voice profile saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
      setPhase("setup");
    }
  };

  return (
    <Screen title="Voice Clone" back testID="voice-clone-screen">
      {phase === "setup" && (
        <View style={styles.center}>
          <HorizontalWaveform state="idle" width={300} height={120} />
          <Text style={[styles.title, { color: tokens.text }]}>Let&apos;s learn your voice</Text>
          <Text style={[styles.sub, { color: tokens.textDim }]}>
            Record 5-10 short phrases. AFIFA uses them to build your voice profile.
          </Text>
          <View style={{ height: 24 }} />
          <NeonButton
            label="Start recording"
            onPress={start}
            icon={<Mic size={18} color="#000" />}
            testID="clone-start"
          />
          <Text style={[styles.hint, { color: tokens.textMuted }]}>
            Voice cloning (ElevenLabs) requires your API key. V1 saves the sample locally.
          </Text>
        </View>
      )}

      {phase === "recording" && (
        <View style={styles.center}>
          <Text style={[styles.timer, { color: tokens.primary }]}>{fmt(elapsed)} / 00:30</Text>
          <HorizontalWaveform state="listening" width={320} height={150} />
          <Text style={[styles.title, { color: tokens.text, marginTop: 16 }]}>Read this aloud</Text>
          <Text style={[styles.phrase, { color: tokens.text, borderColor: tokens.border }]} testID="clone-phrase">
            {`"${PHRASES[phrase]}"`}
          </Text>
          <View style={{ height: 24 }} />
          <Pressable
            onPress={stop}
            testID="clone-stop"
            style={[styles.stopBtn, { backgroundColor: tokens.danger, shadowColor: tokens.danger }]}
          >
            <Square size={22} color="#fff" fill="#fff" />
          </Pressable>
        </View>
      )}

      {phase === "training" && (
        <View style={styles.center}>
          <VoiceCloneRing progress={progress} size={220} label={`${Math.round(progress * 100)}%`} />
          <Text style={[styles.title, { color: tokens.text, marginTop: 18 }]}>Training your voice</Text>
          <Text style={[styles.sub, { color: tokens.textDim }]}>
            Status: Training · Progress {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      {phase === "ready" && (
        <View style={styles.center}>
          <VoiceCloneRing progress={1} size={220} label="Ready" />
          <Text style={[styles.title, { color: tokens.text, marginTop: 18 }]}>Your voice is ready</Text>
          <Text style={[styles.sub, { color: tokens.textDim }]}>
            Profile saved to local memory. Add ElevenLabs to unlock full voice cloning.
          </Text>
          <View style={{ height: 24 }} />
          <NeonButton
            label="Record again"
            variant="secondary"
            onPress={() => {
              setProgress(0);
              setElapsed(0);
              setPhase("setup");
            }}
            testID="clone-restart"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingTop: 16, paddingHorizontal: 8 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 24, textAlign: "center" },
  sub: { fontSize: 14, marginTop: 6, textAlign: "center", lineHeight: 20 },
  hint: { fontSize: 11, marginTop: 16, textAlign: "center" },
  timer: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 18,
    fontVariant: ["tabular-nums"],
  },
  phrase: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    fontStyle: "italic",
    textAlign: "center",
  },
  stopBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
