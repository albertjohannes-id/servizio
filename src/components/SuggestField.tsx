import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Dictionary } from '../i18n/strings';
import { colors } from '../theme';
import { TextField } from './TextField';

function norm(s: string) {
  return s.trim().toLowerCase();
}

export function SuggestField({
  label,
  value,
  onChange,
  options,
  placeholder,
  t,
  addNamed,
  required,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  options: string[];
  placeholder: string;
  t: Dictionary;
  addNamed: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const needle = norm(value);
  const matches = useMemo(() => {
    const unique = [...new Set(options)];
    const list = needle ? unique.filter((name) => norm(name).includes(needle)) : unique;
    return list.sort((a, b) => a.localeCompare(b));
  }, [options, needle]);

  const exact = options.some((name) => norm(name) === needle);
  const canAdd = needle.length > 0 && !exact;

  return (
    <View>
      <TextField
        label={label}
        required={required}
        value={value}
        onChangeText={(text) => {
          setOpen(true);
          onChange(text);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 180);
        }}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {open ? (
        <View style={styles.list}>
          {matches.map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                onChange(name);
                setOpen(false);
              }}
              style={[styles.row, norm(name) === needle && styles.rowOn]}
              accessibilityRole="button"
            >
              <Text style={styles.name}>{name}</Text>
            </Pressable>
          ))}
          {canAdd ? (
            <Pressable
              onPress={() => setOpen(false)}
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.add}>{addNamed.replace('{name}', value.trim())}</Text>
            </Pressable>
          ) : null}
          {matches.length === 0 && !canAdd ? (
            <Text style={styles.empty}>{t.noVendorMatch}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    maxHeight: 220,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowOn: { backgroundColor: '#E8E6E0' },
  name: { fontSize: 16, color: colors.text },
  add: { fontSize: 16, color: colors.text, fontWeight: '600' },
  empty: { padding: 16, fontSize: 14, color: colors.muted },
});
