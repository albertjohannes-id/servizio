import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_INTERVALS } from '../data/seed';
import { AssetType } from '../domain/types';
import { Dictionary } from '../i18n/strings';
import { FieldLabel } from './FieldLabel';
import { colors } from '../theme';

export type ScheduleMode = 'date' | 'km' | 'both' | 'none';

export function scheduleModeFromAsset(
  asset: { scheduleByDate?: boolean; usageEnabled: boolean },
  type: AssetType
): ScheduleMode {
  const kmCapable = DEFAULT_INTERVALS[type]?.km != null;
  const byDate = asset.scheduleByDate !== false;
  const byKm = asset.usageEnabled;
  if (!byDate && !byKm) return 'none';
  if (kmCapable && byDate && byKm) return 'both';
  if (byKm) return 'km';
  return 'date';
}

export function scheduleModeToFlags(mode: ScheduleMode, kmCapable: boolean): {
  scheduleByDate: boolean;
  usageEnabled: boolean;
} {
  if (mode === 'none') return { scheduleByDate: false, usageEnabled: false };
  if (mode === 'km') return { scheduleByDate: false, usageEnabled: true };
  if (mode === 'both' && kmCapable) return { scheduleByDate: true, usageEnabled: true };
  return { scheduleByDate: true, usageEnabled: false };
}

const MODES: { id: ScheduleMode; title: keyof Dictionary; hint: keyof Dictionary; kmOnly?: boolean }[] = [
  { id: 'date', title: 'scheduleDate', hint: 'scheduleDateHint' },
  { id: 'km', title: 'scheduleKm', hint: 'scheduleKmHint', kmOnly: true },
  { id: 'both', title: 'scheduleBoth', hint: 'scheduleBothHint', kmOnly: true },
  { id: 'none', title: 'scheduleNone', hint: 'scheduleNoneHint' },
];

export function ScheduleModePicker({
  type,
  value,
  onChange,
  t,
}: {
  type: AssetType;
  value: ScheduleMode;
  onChange: (next: ScheduleMode) => void;
  t: Dictionary;
}) {
  const kmCapable = DEFAULT_INTERVALS[type]?.km != null;
  const options = MODES.filter((m) => !m.kmOnly || kmCapable);

  return (
    <View>
      <FieldLabel label={t.scheduleMode} required />
      <View style={styles.wrap}>
        {options.map((item) => {
          const on = item.id === value;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              style={[styles.card, on && styles.cardOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.title, on && styles.titleOn]}>{t[item.title]}</Text>
              <Text style={styles.hint}>{t[item.hint]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 0 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  cardOn: { borderColor: colors.text, backgroundColor: '#E8E6E0' },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  titleOn: { color: colors.text },
  hint: { marginTop: 3, fontSize: 12, color: colors.muted, lineHeight: 16 },
});
