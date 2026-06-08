import React, { useMemo } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  multiline?: boolean;
  testID?: string;
};

export function NeonInput({ label, helper, error, multiline, testID, ...rest }: Props) {
  const { tokens } = useTheme();
  const borderColor = error ? tokens.danger : tokens.border;

  const minHeight = multiline ? 100 : 52;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: tokens.textDim }]}>{label}</Text> : null}
      <TextInput
        testID={testID}
        placeholderTextColor={tokens.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: tokens.text,
            backgroundColor: tokens.surface,
            borderColor,
            minHeight,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
        {...rest}
      />
      {helper && !error ? (
        <Text style={[styles.helper, { color: tokens.textMuted }]}>{helper}</Text>
      ) : null}
      {error ? <Text style={[styles.helper, { color: tokens.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  helper: { fontSize: 12, marginTop: 4 },
});
