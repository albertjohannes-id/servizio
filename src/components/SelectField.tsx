import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FieldLabel } from './FieldLabel';
import { colors } from '../theme';

type Option<T extends string> = { value: T; label: string; hint?: string; color?: string };

export function SelectField<T extends string>({ label, value, options, onChange, required }: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View>
      <FieldLabel label={label} required={required} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? ''}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        onAccessibilityEscape={() => setOpen(false)}
        style={styles.box}
      >
        <View style={styles.optionLabel}>{selected?.color && <View style={[styles.dot, { backgroundColor: selected.color }]} />}<Text style={styles.value}>{selected?.label}</Text></View>
        <Text accessibilityElementsHidden importantForAccessibility="no">{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && <View style={styles.list}>
        {options.map((option) => (
          <Pressable key={option.value} accessibilityRole="button"
            accessibilityState={{ selected: option.value === value }}
            onPress={() => { onChange(option.value); setOpen(false); }}
            style={[styles.row, option.value === value && styles.selected]}>
            <View style={styles.optionLabel}>{option.color && <View style={[styles.dot, { backgroundColor: option.color }]} />}<Text style={styles.value}>{option.label}</Text></View>
            {option.hint && <Text style={styles.hint}>{option.hint}</Text>}
          </Pressable>
        ))}
      </View>}
      {!open && selected?.hint && <Text style={styles.hint}>{selected.hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  box: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  value: { fontSize: 16, color: colors.text, flexShrink: 1 },
  list: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, marginTop: 4 },
  row: { minHeight: 48, padding: 12, justifyContent: 'center' },
  selected: { backgroundColor: '#E8E6E0' },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 4 },
});
