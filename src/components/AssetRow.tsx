import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { TYPE_IMAGES } from '../data/typeImages';
import { Asset } from '../domain/types';
import { brandModelLine, formatInt, formatKm, yearLine } from '../domain/format';
import { daysUntil, formatDate, resolveServiceStatus } from '../domain/status';
import { Dictionary, Lang } from '../i18n/strings';
import { colors, spacing } from '../theme';

function dueLine(asset: Asset, t: Dictionary, lang: Lang): { text: string; color: string } {
  const service = resolveServiceStatus(asset);
  const days = daysUntil(asset.nextServiceAt);
  if (service === 'in_service') return { text: t.in_service, color: colors.muted };
  if (service === 'overdue') {
    return { text: t.daysLate.replace('{n}', formatInt(Math.abs(days), lang)), color: colors.danger };
  }
  if (service === 'due_soon') {
    return { text: t.dueInDays.replace('{n}', formatInt(Math.max(days, 0), lang)), color: colors.warn };
  }
  return { text: formatDate(asset.nextServiceAt), color: colors.muted };
}

export function AssetRow({
  asset,
  t,
  lang,
  onPress,
}: {
  asset: Asset;
  t: Dictionary;
  lang: Lang;
  onPress: () => void;
}) {
  const due = dueLine(asset, t, lang);
  const spec = brandModelLine(asset);
  const years = yearLine(asset);
  const km =
    asset.usageEnabled && asset.usageCurrent != null ? ` · ${formatKm(asset.usageCurrent, lang)}` : '';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={asset.name}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={TYPE_IMAGES[asset.type]} style={styles.thumb} resizeMode="contain" />
      <View style={styles.body}>
        <Text style={styles.name}>{asset.name}</Text>
        <Text style={styles.meta}>
          {spec ? `${spec} · ` : ''}
          {years ? `${years} · ` : ''}
          {t[asset.type]} · {t[asset.condition]}
          {km}
        </Text>
      </View>
      <Text style={[styles.due, { color: due.color }]}>{due.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: spacing.md,
  },
  pressed: { opacity: 0.55 },
  thumb: { width: 56, height: 56 },
  body: { flex: 1 },
  name: { fontSize: 17, color: colors.text, fontWeight: '500' },
  meta: { fontSize: 13, color: colors.muted, marginTop: 3 },
  due: { fontSize: 13, fontWeight: '500' },
});
