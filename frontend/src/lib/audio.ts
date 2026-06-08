// Audio helpers. Recording uses expo-audio AudioRecorder; playback uses AudioPlayer.

import { Platform } from "react-native";
import {
  AudioModule,
  setAudioModeAsync,
  useAudioPlayer,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";

let initialized = false;
export async function ensureAudioMode() {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
    });
  } catch {}
}

// Plays a base64-encoded mp3 (or other format) via a temporary data URI / file.
export async function playAudioBase64(audioBase64: string, format = "mp3"): Promise<void> {
  await ensureAudioMode();
  if (Platform.OS === "web") {
    // Web: use HTMLAudioElement directly via data URI
    const audio = new Audio(`data:audio/${format};base64,${audioBase64}`);
    await audio.play();
    return new Promise((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
    });
  }
  // Native: write to FS then play
  const FileSystem = await import("expo-file-system/legacy").catch(async () => {
    return await import("expo-file-system").catch(() => null);
  });
  if (!FileSystem) return;
  try {
    const path = `${(FileSystem as any).cacheDirectory ?? ""}afifa_tts_${Date.now()}.${format}`;
    if ((FileSystem as any).writeAsStringAsync) {
      await (FileSystem as any).writeAsStringAsync(path, audioBase64, {
        encoding: "base64",
      });
    }
    const { createAudioPlayer } = await import("expo-audio");
    const player = createAudioPlayer({ uri: path });
    player.play();
    return new Promise((resolve) => {
      setTimeout(resolve, 4000); // simple timeout; player auto-cleans
    });
  } catch {
    return;
  }
}

export { useAudioRecorder, useAudioPlayer, RecordingPresets, AudioModule };
