import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Vendor } from '../domain/types';
import { Dictionary } from '../i18n/strings';
import { colors } from '../theme';
import { TextField } from './TextField';

function norm(s: string) {
  return s.trim().toLowerCase();
}

export function VendorPicker({
  vendors,
  vendorId,
  query,
  onQuery,
  onSelect,
  t,
}: {
  vendors: Vendor[];
  vendorId: string | null;
  query: string;
  onQuery: (text: string) => void;
  onSelect: (id: string | null) => void;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const selected = vendors.find((v) => v.id === vendorId);
  const needle = norm(query);
  const matches = useMemo(() => {
    const list = needle
      ? vendors.filter((v) => norm(v.name).includes(needle))
      : vendors;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors, needle]);

  const exact = vendors.some((v) => norm(v.name) === needle);
  const canAdd = needle.length > 0 && !exact;

  return (
    <View>
      <TextField
        label={t.vendor}
        value={query}
        onChangeText={(text) => {
          setOpen(true);
          onQuery(text);
          onSelect(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 180);
        }}
        placeholder={t.searchVendor}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {selected ? <Text style={styles.chosen}>{t.vendorSelected.replace('{name}', selected.name)}</Text> : null}

      {open ? (
        <View style={styles.list}>
          {matches.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => {
                onSelect(v.id);
                onQuery(v.name);
                setOpen(false);
              }}
              style={[styles.row, v.id === vendorId && styles.rowOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: v.id === vendorId }}
            >
              <Text style={[styles.name, v.id === vendorId && styles.nameOn]}>{v.name}</Text>
            </Pressable>
          ))}
          {canAdd ? (
            <Pressable
              onPress={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.add}>{t.addVendorNamed.replace('{name}', query.trim())}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chosen: { marginTop: 8, fontSize: 13, color: colors.muted },
  list: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    maxHeight: 240,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowOn: { backgroundColor: '#E8E6E0' },
  name: { fontSize: 16, color: colors.text },
  nameOn: { fontWeight: '600' },
  add: { fontSize: 16, color: colors.text, fontWeight: '600' },
});
