import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAssets } from '../data/AssetContext';
import { dictionaries } from '../i18n/strings';
import { colors, spacing } from '../theme';

type Props = {
  label: string;
  value: string;
  onChange: (year: string) => void;
  placeholder?: string;
};

function years(): string[] {
  const max = new Date().getFullYear() + 1;
  const list: string[] = [];
  for (let y = max; y >= 1980; y -= 1) list.push(String(y));
  return list;
}

export function YearPicker({ label, value, onChange, placeholder }: Props) {
  const { state } = useAssets();
  const t = dictionaries[state.language];
  const [open, setOpen] = useState(false);
  const options = useMemo(() => years(), []);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.box}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder || '—'}</Text>
        <Text style={styles.chevron}>{open ? t.closeList : t.pickYear}</Text>
      </Pressable>
      {open ? (
        <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
            style={styles.row}
          >
            <Text style={styles.muted}>—</Text>
          </Pressable>
          {options.map((year) => (
            <Pressable
              key={year}
              onPress={() => {
                onChange(year);
                setOpen(false);
              }}
              style={[styles.row, year === value && styles.rowOn]}
            >
              <Text style={[styles.name, year === value && styles.nameOn]}>{year}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
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
    paddingLeft: 20,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 17, color: colors.text },
  placeholder: { color: colors.muted },
  chevron: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  list: {
    marginTop: 8,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowOn: { backgroundColor: '#E8E6E0' },
  name: { fontSize: 16, color: colors.text },
  nameOn: { fontWeight: '700' },
  muted: { fontSize: 16, color: colors.muted },
});
