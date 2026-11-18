import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

const LENGTH = 6;

/**
 * Six boxes for a one-time code. A single hidden TextInput sits underneath, so the
 * keyboard, autofill (`one-time-code`) and paste all still target one real field.
 */
export function OtpInput({
  value,
  onChangeText,
  onSubmitEditing,
  autoFocus,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (digits: string) => void;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  accessibilityLabel: string;
}) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, LENGTH - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
      style={styles.row}
    >
      {Array.from({ length: LENGTH }, (_, i) => {
        const char = value[i] ?? '';
        const active = focused && i === activeIndex;
        return (
          <View
            key={i}
            style={[styles.box, char ? styles.filled : null, active && styles.active]}
          >
            <Text style={styles.digit}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChangeText(v.replace(/\D/g, '').slice(0, LENGTH))}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        maxLength={LENGTH}
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden={false}
        style={styles.hiddenInput}
        {...(Platform.OS === 'web' ? ({ inputMode: 'numeric' } as object) : {})}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { borderColor: colors.muted },
  active: { borderColor: colors.text, borderWidth: 2 },
  digit: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    fontSize: 16,
    color: 'transparent',
  },
});
