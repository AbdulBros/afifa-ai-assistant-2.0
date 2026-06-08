// AFIFA HorizontalWaveform — the brand visual.
// Renders the iconic audio-waveform: vertical bars whose heights follow a
// bell-curve envelope (tallest in the center, tapering to the sides). Each bar
// is animated via reanimated based on the assistant's state.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/src/theme/ThemeContext";

export type WaveState = "idle" | "listening" | "thinking" | "speaking" | "completed";

type Props = {
  state?: WaveState;
  width?: number;
  height?: number;
  barCount?: number;
  showDots?: boolean;
  color?: string;
};

/**
 * One bar of the waveform. Uses a single shared time value with a per-bar
 * phase offset so we get an organic, music-visualizer feel.
 */
function Bar({
  index,
  total,
  time,
  state,
  height,
  color,
}: {
  index: number;
  total: number;
  time: Animated.SharedValue<number>;
  state: WaveState;
  height: number;
  color: string;
}) {
  // bell-curve envelope: center bars are tallest
  const t = index / (total - 1);
  const envelope = Math.pow(Math.sin(Math.PI * t), 1.4);
  // phase offset so adjacent bars don't move in lockstep
  const phase = index * 0.32;
  // random-ish secondary phase for organic variation
  const phase2 = (index * 1.7) % (Math.PI * 2);

  const style = useAnimatedStyle(() => {
    let amp = 0.25; // idle baseline
    let speed = 1;
    if (state === "idle" || state === "completed") {
      amp = 0.3 + 0.12 * Math.abs(Math.sin(time.value * 0.8 + phase));
      speed = 0.8;
    } else if (state === "listening") {
      const a = Math.abs(Math.sin(time.value * 3 + phase));
      const b = Math.abs(Math.sin(time.value * 5 + phase2));
      amp = 0.25 + 0.75 * (a * 0.6 + b * 0.4);
      speed = 3;
    } else if (state === "thinking") {
      amp = 0.35 + 0.25 * Math.abs(Math.sin(time.value * 2 + phase));
      speed = 2;
    } else if (state === "speaking") {
      const a = Math.abs(Math.sin(time.value * 6 + phase));
      const b = Math.abs(Math.sin(time.value * 9 + phase2));
      amp = 0.3 + 0.7 * (a * 0.5 + b * 0.5);
      speed = 6;
    }
    const finalH = Math.max(2, envelope * amp * height);
    const opacity = interpolate(envelope, [0, 0.4, 1], [0.35, 0.7, 1]);
    return {
      height: finalH,
      opacity,
    };
  }, [state, height]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
          shadowColor: color,
          width: 3,
        },
        style,
      ]}
    />
  );
}

export function HorizontalWaveform({
  state = "idle",
  width = 320,
  height = 140,
  barCount = 42,
  showDots = true,
  color,
}: Props) {
  const { tokens } = useTheme();
  const c = color || tokens.primary;

  const time = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(time);
    time.value = 0;
    time.value = withRepeat(
      withTiming(Math.PI * 200, { duration: 200000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(time);
  }, [time]);

  return (
    <View
      style={[styles.wrap, { width, height }]}
      testID="afifa-waveform"
    >
      <View style={[styles.row, { height }]}>
        {Array.from({ length: barCount }).map((_, i) => (
          <Bar
            key={i}
            index={i}
            total={barCount}
            time={time}
            state={state}
            height={height}
            color={c}
          />
        ))}
      </View>
      {showDots ? (
        <View style={styles.dotsRow}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: c,
                  opacity: 0.25 + 0.5 * Math.sin((i / 23) * Math.PI),
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  bar: {
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
