import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { TYPE_IMAGES } from '../data/typeImages';
import { Asset, ConditionStatus, ServiceStatus } from '../domain/types';
import { isScheduleTracked, maintenanceTileDisplay, resolveServiceStatus } from '../domain/status';
import { Dictionary, Lang } from '../i18n/strings';
import { colors } from '../theme';

function tileFill(asset: Asset, status: ServiceStatus): string {
  if (!isScheduleTracked(asset)) return colors.tileUntracked;
  if (status === 'overdue') return colors.tileOverdue;
  if (status === 'due_soon') return colors.tileDueSoon;
  return colors.tileOnTrack;
}

function conditionColor(condition: ConditionStatus): string {
  if (condition === 'needs_attention') return colors.warn;
  if (condition === 'not_working') return colors.danger;
  return colors.ok;
}

export function AssetTile({
  asset,
  t,
  lang,
  size,
  compact,
  onPress,
}: {
  asset: Asset;
  t: Dictionary;
  lang: Lang;
  size: number;
  compact?: boolean;
  onPress: () => void;
}) {
  const status = resolveServiceStatus(asset);
  const displayLines = maintenanceTileDisplay(asset, t, lang, !!compact);
  const icon = compact ? 28 : 64;
  const pad = compact ? 8 : 12;
  const atShop = asset.location === 'service_center';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${asset.name}. ${t[asset.condition]}. ${displayLines.join('. ')}`}
      style={({ pressed }) => [
        styles.tile,
        {
          width: size,
          height: size,
          padding: pad,
          backgroundColor: tileFill(asset, status),
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.media}>
          <Image
            source={TYPE_IMAGES[asset.type]}
            style={{ width: icon, height: icon }}
            resizeMode="contain"
          />
          {atShop ? (
            compact ? (
              <Image
                source={require('../../assets/location/workshop.png')}
                style={styles.badgeIcon}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.badge} numberOfLines={1}>
                {t.locationServiceCenter}
              </Text>
            )
          ) : null}
        </View>
        <View
          style={[
            styles.conditionDot,
            compact && styles.conditionDotCompact,
            { backgroundColor: conditionColor(asset.condition) },
          ]}
          accessibilityLabel={t[asset.condition]}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={compact ? 2 : 2}>
          {asset.name}
        </Text>
        {compact ? null : (
          <Text style={styles.kind} numberOfLines={1}>
            {t[asset.type]}
          </Text>
        )}
        {displayLines.length === 0 ? (
          <Text style={[styles.due, compact && styles.dueCompact]} numberOfLines={1}>
            {t.noSchedule}
          </Text>
        ) : (
          displayLines.map((line, i) => (
            <Text
              key={i}
              style={[styles.due, compact && styles.dueCompact, i > 0 && styles.dueSecondary]}
              numberOfLines={compact ? 1 : 2}
            >
              {line}
            </Text>
          ))
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.78 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  media: { flex: 1, alignItems: 'flex-start', gap: 6 },
  conditionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  conditionDotCompact: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeIcon: { width: 22, height: 22, backgroundColor: 'transparent' },
  body: { gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  nameCompact: { fontSize: 13, lineHeight: 16 },
  kind: { fontSize: 12, color: colors.muted },
  due: { marginTop: 2, fontSize: 12, fontWeight: '500', color: colors.text },
  dueCompact: { fontSize: 11, marginTop: 0 },
  dueSecondary: { fontSize: 11, fontWeight: '400', color: colors.muted, marginTop: 0 },
});
