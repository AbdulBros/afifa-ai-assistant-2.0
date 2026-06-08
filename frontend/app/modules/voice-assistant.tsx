// Voice Assistant — tap-to-talk: record → Whisper STT → LLM → TTS → playback.

import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/AuthContext";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { VoiceOrb, OrbState } from "@/src/components/VoiceOrb";
import { Voice, Chat } from "@/src/lib/api";
import { playAudioBase64, ensureAudioMode } from "@/src/lib/audio";
import { useTheme } from "@/src/theme/ThemeContext";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";

export default function VoiceAssistant() {
  const { tokens } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    ensureAudioMode();
  }, []);

  const start = async () => {
    if (state !== "idle" && state !== "completed") return;
    if (Platform.OS !== "web") {
      const granted = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted.granted) {
        toast.show("Microphone permission needed", "error");
        return;
      }
    } else {
      // On web, expo-audio recording is limited. Inform.
      toast.show("Voice recording works on the mobile build. Use text chat on web.", "info");
      return;
    }
    setTranscript("");
    setReply("");
    setState("listening");
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      toast.show("Could not start recording", "error");
      setState("idle");
    }
  };

  const stop = async () => {
    if (state !== "listening") return;
    setState("thinking");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording");
      // 1) Transcribe
      const t = await Voice.transcribe(uri);
      setTranscript(t.text);
      // 2) Send to chat (creates conv if needed)
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
      // 3) Speak
      setState("speaking");
      const tts = await Voice.tts(ai, profile?.voice_id ?? "alloy");
      await playAudioBase64(tts.audio_base64, tts.format);
      setState("completed");
    } catch (e: any) {
      toast.show(e?.message ?? "Voice failed", "error");
      setState("idle");
    } finally {
      setTimeout(() => setState("idle"), 600);
    }
  };

  const aiName = profile?.ai_name ?? "Afifa";

  return (
    <Screen title="Voice" back testID="voice-assistant-screen" scroll={false}>
      <View style={styles.center}>
        <VoiceOrb state={state} size={260} />
        <Text style={[styles.state, { color: tokens.primary }]}>
          {state === "idle" || state === "completed"
            ? `Hi ${aiName}`
            : state === "listening"
              ? "Listening…"
              : state === "thinking"
                ? "Thinking…"
                : "Speaking…"}
        </Text>

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
            style={[styles.cta, { backgroundColor: tokens.danger }]}
          >
            <Text style={styles.ctaTxt}>Stop & send</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={start}
            testID="voice-start"
            style={[
              styles.cta,
              {
                backgroundColor: tokens.primary,
                shadowColor: tokens.primary,
              },
            ]}
          >
            <Text style={[styles.ctaTxt, { color: "#000" }]}>Tap to talk</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", paddingTop: 16 },
  state: { marginTop: 24, fontSize: 20, fontWeight: "800", letterSpacing: 0.4 },
  bubble: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "94%",
  },
  bLbl: { fontSize: 10, fontWeight: "800", letterSpacing: 1.6, marginBottom: 4 },
  bTxt: { fontSize: 14, lineHeight: 20 },
  controls: { paddingHorizontal: 16, paddingBottom: 24 },
  cta: {
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ctaTxt: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
