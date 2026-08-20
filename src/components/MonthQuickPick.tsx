import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addMonthsIso } from '../domain/status';
import { Dictionary } from '../i18n/strings';
import { colors } from '../theme';

export function MonthQuickPick({
  baseDate,
  selected,
  onSelect,
  t,
}: {
  baseDate: string;
  selected: string;
  onSelect: (iso: string) => void;
  t: Dictionary;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t.monthQuickHint}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5, 6].map((months) => {
          const iso = addMonthsIso(baseDate, months);
          const on = iso === selected;
          return (
            <Pressable
              key={months}
              onPress={() => onSelect(iso)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityLabel={t.monthQuick.replace('{n}', String(months))}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {t.monthQuick.replace('{n}', String(months))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 6 },
  hint: { fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.text, backgroundColor: '#E8E6E0' },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.muted },
  chipTextOn: { color: colors.text, fontWeight: '600' },
});
