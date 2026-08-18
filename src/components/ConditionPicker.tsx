import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ConditionStatus } from '../domain/types';
import { Dictionary } from '../i18n/strings';
import { colors } from '../theme';

const OPTIONS: {
  id: ConditionStatus;
  hint: keyof Dictionary;
  ink: string;
  wash: string;
}[] = [
  { id: 'working', hint: 'workingHint', ink: colors.ok, wash: '#D4EEDC' },
  { id: 'needs_attention', hint: 'needs_attentionHint', ink: colors.warn, wash: '#F4EBD9' },
  { id: 'not_working', hint: 'not_workingHint', ink: colors.danger, wash: '#F3E6E1' },
];

export function ConditionPicker({
  value,
  onChange,
  t,
}: {
  value: ConditionStatus;
  onChange: (next: ConditionStatus) => void;
  t: Dictionary;
}) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((item) => {
        const on = item.id === value;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[styles.card, on && { backgroundColor: item.wash, borderColor: item.ink }]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t[item.id]}
          >
            <View style={[styles.dot, { backgroundColor: item.ink }]} />
            <Text style={[styles.title, on && { color: item.ink }]}>{t[item.id]}</Text>
            <Text style={styles.hint}>{t[item.hint]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 4 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 0 },
  hint: { fontSize: 13, color: colors.muted, flex: 1, minWidth: 120 },
});
