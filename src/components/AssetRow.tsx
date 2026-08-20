import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { TYPE_IMAGES } from '../data/typeImages';
import { Asset } from '../domain/types';
import { brandModelLine, formatKm, yearLine } from '../domain/format';
import { maintenanceTileDisplay } from '../domain/status';
import { Dictionary, Lang } from '../i18n/strings';
import { colors, spacing } from '../theme';

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
  const lines = maintenanceTileDisplay(asset, t, lang, false);
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
      <View style={styles.dueCol}>
        {lines.length === 0 ? (
          <Text style={[styles.due, { color: colors.muted }]}>{t.noSchedule}</Text>
        ) : (
          lines.map((line, i) => (
            <Text key={i} style={styles.due} numberOfLines={2}>
              {line}
            </Text>
          ))
        )}
      </View>
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
  dueCol: { alignItems: 'flex-end', maxWidth: '36%', gap: 2 },
  due: { fontSize: 12, fontWeight: '500', textAlign: 'right', color: colors.muted },
});
