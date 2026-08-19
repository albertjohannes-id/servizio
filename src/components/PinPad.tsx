import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PIN_LENGTH } from '../data/pinAuth';
import { colors, spacing } from '../theme';

type Props = {
  title?: string;
  subtitle?: string;
  error?: string | null;
  disabled?: boolean;
  onComplete: (pin: string) => void;
  onChange?: () => void;
};

export function PinPad({ title, subtitle, error, disabled, onComplete, onChange }: Props) {
  const [digits, setDigits] = useState('');

  useEffect(() => {
    if (digits.length === PIN_LENGTH) {
      onComplete(digits);
      setDigits('');
    }
  }, [digits, onComplete]);

  const dots = useMemo(
    () => Array.from({ length: PIN_LENGTH }, (_, index) => index < digits.length),
    [digits]
  );

  const pressDigit = (value: string) => {
    if (disabled || digits.length >= PIN_LENGTH) return;
    onChange?.();
    setDigits((prev) => prev + value);
  };

  const backspace = () => {
    if (disabled) return;
    onChange?.();
    setDigits((prev) => prev.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.dotsRow}>
        {dots.map((filled, index) => (
          <View key={index} style={[styles.dot, filled && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        {keys.map((key, index) => {
          if (!key) return <View key={index} style={styles.keySpacer} />;
          const isBack = key === '⌫';
          return (
            <Pressable
              key={key + index}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              onPress={() => (isBack ? backspace() : pressDigit(key))}
              disabled={disabled}
            >
              <Text style={styles.keyLabel}>{key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: 22, fontWeight: '500', color: colors.text, letterSpacing: -0.3 },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  dotsRow: { flexDirection: 'row', gap: 14, marginTop: spacing.lg, marginBottom: spacing.sm },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.text, borderColor: colors.text },
  error: {
    minHeight: 20,
    marginBottom: spacing.sm,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  keySpacer: { width: '30%', aspectRatio: 1.2 },
  key: {
    width: '30%',
    aspectRatio: 1.2,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyPressed: { opacity: 0.7 },
  keyLabel: { fontSize: 24, color: colors.text, fontWeight: '500' },
});
