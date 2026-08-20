import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function FieldLabel({
  label,
  required,
  style,
}: {
  label: string;
  required?: boolean;
  style?: object;
}) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      {required ? <Text style={styles.star}> *</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  star: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'none',
  },
});
