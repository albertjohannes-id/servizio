import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { resolveServiceStatus } from '../domain/status';
import { formatInt } from '../domain/format';
import { dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DebugMetrics'>;

export function DebugMetricsScreen({ navigation }: Props) {
  const { state, resetDemo } = useAssets();
  const t = dictionaries[state.language];

  const active = state.assets.filter((a) => !a.archived);
  const overdue = active.filter((a) => resolveServiceStatus(a) === 'overdue');
  const overdueShare = active.length
    ? `${Math.round((overdue.length / active.length) * 100)}%`
    : 'n/a';

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of state.events) {
      map[e.eventType] = (map[e.eventType] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [state.events]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.debug}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t.overdueShare}</Text>
        <Text style={styles.value}>
          {overdueShare} ({formatInt(overdue.length, state.language)}/{formatInt(active.length, state.language)})
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{t.events}</Text>
        <Text style={styles.value}>{formatInt(state.events.length, state.language)}</Text>
        {counts.map(([k, v]) => (
          <Text key={k} style={styles.meta}>
            {k}: {formatInt(v, state.language)}
          </Text>
        ))}
      </View>
      <PrimaryButton label={t.resetDemo} variant="ghost" onPress={resetDemo} />
      <PrimaryButton label={t.cancel} onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md, gap: spacing.md },
  title: { fontSize: 22, fontWeight: '500', color: colors.text },
  card: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 4 },
  label: { color: colors.muted, fontSize: 13 },
  value: { fontSize: 20, fontWeight: '500', color: colors.text },
  meta: { color: colors.muted, fontSize: 13 },
});
