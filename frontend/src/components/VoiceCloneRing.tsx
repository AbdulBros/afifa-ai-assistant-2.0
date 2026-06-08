// Voice Clone progress ring — circular SVG ring with mini waveform inside.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { HorizontalWaveform } from "@/src/components/HorizontalWaveform";
import { useTheme } from "@/src/theme/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number; // 0..1
  size?: number;
  label?: string;
};

export function VoiceCloneRing({ progress, size = 220, label }: Props) {
  const { tokens } = useTheme();
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID="voice-clone-ring">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tokens.border}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tokens.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          // rotate so progress starts at 12 o'clock
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.inner}>
        <HorizontalWaveform
          state="speaking"
          width={size * 0.6}
          height={size * 0.35}
          barCount={18}
          showDots={false}
        />
        {label ? <Text style={[styles.label, { color: tokens.text }]}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  inner: { alignItems: "center" },
  label: { marginTop: 8, fontSize: 12, fontWeight: "600", letterSpacing: 1.2 },
});
