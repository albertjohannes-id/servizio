import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAssets } from '../data/AssetContext';
import { formatInt } from '../domain/format';
import { ServiceStatus } from '../domain/types';
import { colors, spacing } from '../theme';

const ACCENT: Record<ServiceStatus, { ink: string; wash: string }> = {
  overdue: { ink: colors.danger, wash: '#F3E6E1' },
  due_soon: { ink: colors.warn, wash: '#F4EBD9' },
  on_schedule: { ink: colors.ok, wash: '#D4EEDC' },
};

export function SectionHeader({
  title,
  count,
  status,
  first,
}: {
  title: string;
  count: number;
  status: ServiceStatus;
  first?: boolean;
}) {
  const tone = ACCENT[status];
  const { state } = useAssets();
  return (
    <View style={[styles.wrap, first && styles.first, { backgroundColor: tone.wash }]}>
      <View style={[styles.bar, { backgroundColor: tone.ink }]} />
      <Text style={[styles.title, { color: tone.ink }]}>{title}</Text>
      <View style={[styles.badge, { borderColor: tone.ink }]}>
        <Text style={[styles.count, { color: tone.ink }]}>{formatInt(count, state.language)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
    marginBottom: 4,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 0,
  },
  first: { marginTop: spacing.sm },
  bar: { width: 5, height: 22 },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignItems: 'center',
  },
  count: { fontSize: 13, fontWeight: '700' },
});
