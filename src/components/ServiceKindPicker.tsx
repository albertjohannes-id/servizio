import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ServiceLogKind } from '../domain/types';
import { Dictionary } from '../i18n/strings';
import { FieldLabel } from './FieldLabel';
import { colors } from '../theme';

const OPTIONS: { id: ServiceLogKind; title: keyof Dictionary; hint: keyof Dictionary }[] = [
  { id: 'routine', title: 'serviceKindRoutine', hint: 'serviceKindRoutineHint' },
  { id: 'one_time', title: 'serviceKindOneTime', hint: 'serviceKindOneTimeHint' },
];

export function ServiceKindPicker({
  value,
  onChange,
  t,
}: {
  value: ServiceLogKind;
  onChange: (next: ServiceLogKind) => void;
  t: Dictionary;
}) {
  return (
    <View>
      <FieldLabel label={t.serviceKind} required />
      <View style={styles.wrap}>
        {OPTIONS.map((item) => {
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
  wrap: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  cardOn: { borderColor: colors.text, backgroundColor: '#E8E6E0' },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  titleOn: { color: colors.text },
  hint: { marginTop: 4, fontSize: 11, color: colors.muted, lineHeight: 15 },
});
