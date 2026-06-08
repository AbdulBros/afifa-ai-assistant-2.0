import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

import { useTheme } from "@/src/theme/ThemeContext";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "completed";

type Props = {
  state: OrbState;
  size?: number;
};

/**
 * VoiceOrb: a central circle with 3 concentric pulsing rings and an inner
 * glowing core. Animations driven by reanimated for 60fps on the UI thread.
 */
export function VoiceOrb({ state, size = 220 }: Props) {
  const { tokens } = useTheme();

  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const pulse3 = useSharedValue(0);
  const core = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse1);
    cancelAnimation(pulse2);
    cancelAnimation(pulse3);
    cancelAnimation(core);
    cancelAnimation(rotate);

    const ringLoop = (sv: Animated.SharedValue<number>, delay: number, duration: number) => {
      sv.value = 0;
      sv.value = withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    };

    if (state === "idle" || state === "completed") {
      core.value = withRepeat(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
    if (state === "listening") {
      ringLoop(pulse1, 0, 1600);
      ringLoop(pulse2, 0, 1600);
      ringLoop(pulse3, 0, 1600);
      core.value = withRepeat(
        withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
    if (state === "thinking") {
      rotate.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false,
      );
      core.value = withRepeat(
        withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
    if (state === "speaking") {
      core.value = withRepeat(
        withTiming(1.14, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      ringLoop(pulse1, 0, 1100);
    }
  }, [state, pulse1, pulse2, pulse3, core, rotate]);

  const ringStyle1 = useAnimatedStyle(() => {
    const v = pulse1.value % 1;
    return { opacity: 1 - v, transform: [{ scale: 0.5 + v * 1.1 }] };
  });
  const ringStyle2 = useAnimatedStyle(() => {
    const v = (pulse2.value + 0.33) % 1;
    return { opacity: 1 - v, transform: [{ scale: 0.5 + v * 1.1 }] };
  });
  const ringStyle3 = useAnimatedStyle(() => {
    const v = (pulse3.value + 0.66) % 1;
    return { opacity: 1 - v, transform: [{ scale: 0.5 + v * 1.1 }] };
  });

  const r1 = ringStyle1;
  const r2 = ringStyle2;
  const r3 = ringStyle3;

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: core.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID="voice-orb">
      <Animated.View
        style={[
          styles.ring,
          { borderColor: tokens.primary, width: size, height: size, borderRadius: size / 2 },
          r1,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { borderColor: tokens.primary, width: size, height: size, borderRadius: size / 2 },
          r2,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { borderColor: tokens.primary, width: size, height: size, borderRadius: size / 2 },
          r3,
        ]}
      />
      {state === "thinking" && (
        <Animated.View
          style={[
            styles.thinkingRing,
            {
              width: size * 0.82,
              height: size * 0.82,
              borderRadius: (size * 0.82) / 2,
              borderColor: tokens.primary,
            },
            rotateStyle,
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.core,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: (size * 0.55) / 2,
            backgroundColor: tokens.primary,
            shadowColor: tokens.primary,
          },
          coreStyle,
        ]}
      />
      <View
        style={[
          styles.innerDot,
          {
            width: size * 0.18,
            height: size * 0.18,
            borderRadius: (size * 0.18) / 2,
            backgroundColor: "#fff",
            shadowColor: tokens.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
  },
  thinkingRing: {
    position: "absolute",
    borderWidth: 2,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  core: {
    position: "absolute",
    opacity: 0.55,
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  innerDot: {
    position: "absolute",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
