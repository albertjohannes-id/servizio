import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate, todayIso } from '../domain/status';
import { dictionaries } from '../i18n/strings';
import { useAssets } from '../data/AssetContext';
import { FieldLabel } from './FieldLabel';
import { colors } from '../theme';

type Props = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isoFrom(d: Date): string {
  return todayIso(d);
}

function monthLabel(cursor: Date, lang: 'en' | 'id'): string {
  return cursor.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function buildCells(cursor: Date): (number | null)[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateField({ label, value, onChange, required }: Props) {
  const { state } = useAssets();
  const t = dictionaries[state.language];
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIso(value || todayIso()), [value]);
  const [cursor, setCursor] = useState(selected);

  const openPicker = () => {
    setCursor(selected);
    setOpen(true);
  };

  const cells = buildCells(cursor);
  const selectedIso = value;

  return (
    <View>
      <FieldLabel label={label} required={required} />
      <Pressable
        onPress={openPicker}
        style={styles.box}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${formatDate(value)}`}
      >
        <Text style={styles.value}>{formatDate(value)}</Text>
        <Text style={styles.chevron}>{t.pickDate}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.monthRow}>
              <Pressable
                hitSlop={8}
                onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <Text style={styles.nav}>‹</Text>
              </Pressable>
              <Text style={styles.month}>{monthLabel(cursor, state.language)}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <Text style={styles.nav}>›</Text>
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((d, i) => (
                <Text key={`${d}-${i}`} style={styles.weekday}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day == null) {
                  return <View key={`e-${i}`} style={styles.cell} />;
                }
                const iso = isoFrom(new Date(cursor.getFullYear(), cursor.getMonth(), day));
                const on = iso === selectedIso;
                const isToday = iso === todayIso();
                return (
                  <Pressable
                    key={iso}
                    style={[styles.cell, on && styles.cellOn, isToday && !on && styles.cellToday]}
                    onPress={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.day, on && styles.dayOn]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => {
                onChange(todayIso());
                setOpen(false);
              }}
              style={styles.todayBtn}
            >
              <Text style={styles.todayLabel}>{t.today}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    minHeight: 52,
    paddingLeft: 20,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 17, color: colors.text },
  chevron: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,26,23,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.surface,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  month: { fontSize: 16, fontWeight: '600', color: colors.text },
  nav: { fontSize: 22, color: colors.text, paddingHorizontal: 6 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { backgroundColor: colors.text },
  cellToday: { borderWidth: 1, borderColor: colors.text },
  day: { fontSize: 15, color: colors.text },
  dayOn: { color: colors.primaryText, fontWeight: '600' },
  todayBtn: { alignItems: 'center', paddingTop: 10 },
  todayLabel: { fontSize: 14, color: colors.text, textDecorationLine: 'underline' },
});
