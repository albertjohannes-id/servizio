import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing } from '../theme';

type Props = TextInputProps & {
  label?: string;
};

/** Bordered field with inset text so values never sit flush on the box. */
export function TextField({ label, style, multiline, ...rest }: Props) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, multiline && styles.boxMulti]}>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.muted}
          style={[styles.input, multiline && styles.inputMulti, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: spacing.md,
    marginBottom: 8,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    minHeight: 52,
    justifyContent: 'center',
  },
  boxMulti: { minHeight: 96, justifyContent: 'flex-start' },
  input: {
    fontSize: 17,
    color: colors.text,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 20,
    paddingRight: 16,
    margin: 0,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
});
