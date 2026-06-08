// Voice Assistant screen — full-screen tap-to-talk with horizontal waveform hero.
// Flow: tap mic → record → Whisper STT → LLM → TTS playback. Shows live timer.

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Voice, Chat } from "@/src/lib/api";
import { playAudioBase64, ensureAudioMode } from "@/src/lib/audio";
import { useTheme } from "@/src/theme/ThemeContext";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";

type State = "idle" | "listening" | "thinking" | "speaking" | "completed";

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoiceAssistant() {
  const { tokens } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<State>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    ensureAudioMode();
  }, []);

  const startTimer = () => {
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = (setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000) as unknown) as number;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => stopTimer(), []);

  const start = async () => {
    if (state !== "idle" && state !== "completed") return;
    if (Platform.OS !== "web") {
      const granted = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted.granted) {
        toast.show("Microphone permission needed", "error");
        return;
      }
    } else {
      toast.show("Voice recording requires the mobile build. Use Chat on web.", "info");
      return;
    }
    setTranscript("");
    setReply("");
    setState("listening");
    startTimer();
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      toast.show("Could not start recording", "error");
      setState("idle");
      stopTimer();
    }
  };

  const stop = async () => {
    if (state !== "listening") return;
    setState("thinking");
    stopTimer();
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording");
      const t = await Voice.transcribe(uri);
      setTranscript(t.text);
      let cid = conversationId;
      if (!cid) {
        const cr: any = await Chat.create({});
        cid = cr.conversation.conversation_id;
        setConversationId(cid);
      }
      const r: any = await Chat.send(
        cid!,
        t.text,
        profile?.model_provider,
        profile?.model_name,
      );
      const ai = r.assistant_message.content as string;
      setReply(ai);
      setState("speaking");
      const tts = await Voice.tts(ai, profile?.voice_id ?? "alloy");
      await playAudioBase64(tts.audio_base64, tts.format);
      setState("completed");
    } catch (e: any) {
      toast.show(e?.message ?? "Voice failed", "error");
      setState("idle");
    } finally {
      setTimeout(() => setState("idle"), 800);
    }
  };

  const aiName = profile?.ai_name ?? "Afifa";

  const label =
    state === "listening"
      ? "Listening…"
      : state === "thinking"
        ? "Thinking…"
        : state === "speaking"
          ? `${aiName} is speaking…`
          : state === "completed"
            ? "Done"
            : `Tap to talk to ${aiName}`;

  return (
    <Screen title={aiName} back testID="voice-assistant-screen" scroll={false} hideTabPadding>
      <View style={styles.center}>
        <Text style={[styles.brand, { color: tokens.text }]}>{aiName}</Text>
        <View style={{ height: 24 }} />
        <HorizontalWaveform state={state} width={340} height={170} barCount={48} />
        <Text style={[styles.timer, { color: tokens.primary }]}>
          {state === "listening" ? fmt(elapsed) : "00:00"}
        </Text>
        <Text style={[styles.stateLbl, { color: tokens.textDim }]}>{label}</Text>

        {transcript ? (
          <View
            style={[
              styles.bubble,
              { borderColor: tokens.border, backgroundColor: tokens.surface },
            ]}
          >
            <Text style={[styles.bLbl, { color: tokens.textDim }]}>YOU</Text>
            <Text style={[styles.bTxt, { color: tokens.text }]}>{transcript}</Text>
          </View>
        ) : null}

        {reply ? (
          <View
            style={[
              styles.bubble,
              { borderColor: tokens.borderActive, backgroundColor: tokens.primary + "11" },
            ]}
          >
            <Text style={[styles.bLbl, { color: tokens.primary }]}>{aiName.toUpperCase()}</Text>
            <Text style={[styles.bTxt, { color: tokens.text }]}>{reply}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        {state === "listening" ? (
          <Pressable
            onPress={stop}
            testID="voice-stop"
            style={[
              styles.micBtn,
              { backgroundColor: tokens.danger, shadowColor: tokens.danger },
            ]}
          >
            <Square size={28} color="#fff" fill="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={start}
            testID="voice-start"
            disabled={state === "thinking" || state === "speaking"}
            style={[
              styles.micBtn,
              {
                backgroundColor: tokens.primary,
                shadowColor: tokens.primary,
                opacity: state === "thinking" || state === "speaking" ? 0.6 : 1,
              },
            ]}
          >
            <Mic size={28} color="#000" />
          </Pressable>
        )}
        <Text style={[styles.hint, { color: tokens.textMuted }]}>
          {state === "listening" ? "Tap to stop & send" : "Tap mic to begin"}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", paddingTop: 16 },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 4,
  },
  timer: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },
  stateLbl: { marginTop: 6, fontSize: 13, letterSpacing: 1.2, fontWeight: "600", textTransform: "uppercase" },
  bubble: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "94%",
    width: "94%",
  },
  bLbl: { fontSize: 10, fontWeight: "800", letterSpacing: 1.6, marginBottom: 4 },
  bTxt: { fontSize: 14, lineHeight: 20 },
  controls: { paddingHorizontal: 16, paddingBottom: 32, alignItems: "center" },
  micBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  hint: { marginTop: 12, fontSize: 12, letterSpacing: 1.2 },
});
