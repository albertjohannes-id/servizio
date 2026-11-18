import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { syncAssetReminders } from '../data/notifications';
import { HOME_BUCKETS, HomeBucket, homeBucket, sortAssetsForHome } from '../domain/status';
import { dictionaries } from '../i18n/strings';
import { AssetTile } from '../components/AssetTile';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { Copyright } from '../components/Copyright';
import { WhatsNewModal } from '../components/WhatsNewModal';
import { markWhatsNewSeen, shouldShowWhatsNew } from '../data/changelogStorage';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const GRID_GAP = 12;

export function HomeScreen({ navigation }: Props) {
  const { email, cloudLinked, emailVerified } = useAuth();
  const { ready, state, setLanguage, syncStatus, syncMeta } = useAssets();
  const t = dictionaries[state.language];
  const insets = useSafeAreaInsets();
  const assets = useMemo(() => sortAssetsForHome(state.assets), [state.assets]);
  const [gridWidth, setGridWidth] = useState(0);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [activeBuckets, setActiveBuckets] = useState<HomeBucket[]>([...HOME_BUCKETS]);
  const columns = state.homeColumns === 3 ? 3 : 2;
  const filtering = activeBuckets.length < HOME_BUCKETS.length;
  const visibleAssets = useMemo(
    () => (filtering ? assets.filter((a) => activeBuckets.includes(homeBucket(a))) : assets),
    [assets, activeBuckets, filtering]
  );

  /** All selected by default. Tap one while all are on to show only it; tap more to add; none left = all again. */
  const toggleBucket = (bucket: HomeBucket) => {
    setActiveBuckets((prev) => {
      if (prev.length === HOME_BUCKETS.length) return [bucket];
      if (prev.includes(bucket)) {
        const next = prev.filter((b) => b !== bucket);
        return next.length ? next : [...HOME_BUCKETS];
      }
      return [...prev, bucket];
    });
  };
  const showAllBuckets = () => setActiveBuckets([...HOME_BUCKETS]);

  useEffect(() => {
    let cancelled = false;
    void shouldShowWhatsNew().then((show) => {
      if (show && !cancelled) setWhatsNewOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const closeWhatsNew = () => {
    setWhatsNewOpen(false);
    void markWhatsNewSeen();
  };

  const showSyncBanner =
    syncStatus === 'conflict' ||
    syncStatus === 'error' ||
    (cloudLinked && syncStatus === 'offline' && syncMeta.dirty);

  const tileSize =
    gridWidth > 0 ? (gridWidth - GRID_GAP * (columns - 1)) / columns : 0;

  const onGridLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (Math.abs(next - gridWidth) > 1) setGridWidth(next);
  };

  useEffect(() => {
    if (ready) void syncAssetReminders(state.assets);
  }, [ready, state.assets]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <Text style={styles.mark}>{t.appName}</Text>
          <View style={styles.langRow}>
            {(['en', 'id'] as const).map((lang) => (
              <Pressable key={lang} onPress={() => setLanguage(lang)} hitSlop={8}>
                <Text style={[styles.lang, state.language === lang && styles.langOn]}>
                  {lang.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {showSyncBanner ? (
          <Pressable
            onPress={() => navigation.navigate('Account')}
            style={styles.syncBanner}
          >
            <Text style={styles.syncBannerText}>
              {syncStatus === 'conflict'
                ? t.syncConflictTitle
                : syncStatus === 'error'
                  ? t.syncError
                  : t.syncOffline}
            </Text>
            <Text style={styles.syncBannerSub}>
              {syncStatus === 'conflict'
                ? t.syncConflictBody
                : syncStatus === 'error'
                  ? t.syncNow
                  : t.syncPending}
            </Text>
          </Pressable>
        ) : null}

        <ScrollView
          contentContainerStyle={{ paddingBottom: 16 }}
          style={styles.scroll}
        >
          {assets.length ? (
            <>
              <View style={styles.legend}>
                {(
                  [
                    ['overdue', colors.tileOverdue, t.sectionOverdue],
                    ['due_soon', colors.tileDueSoon, t.sectionDueSoon],
                    ['on_track', colors.tileOnTrack, t.sectionOnTrack],
                    ['no_schedule', colors.tileUntracked, t.sectionNoSchedule],
                  ] as const
                ).map(([bucket, color, label]) => (
                  <LegendFilter
                    key={bucket}
                    color={color}
                    label={label}
                    outlined={bucket === 'no_schedule'}
                    selected={activeBuckets.includes(bucket)}
                    filtering={filtering}
                    onPress={() => toggleBucket(bucket)}
                  />
                ))}
              </View>
              {filtering ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={showAllBuckets}
                  hitSlop={8}
                  style={styles.showAll}
                >
                  <Text style={styles.showAllText}>{t.showAll}</Text>
                </Pressable>
              ) : null}
              {visibleAssets.length === 0 ? (
                <View style={styles.filterEmpty}>
                  <Text style={styles.emptyBody}>{t.filterEmpty}</Text>
                </View>
              ) : null}
              <View style={[styles.grid, { gap: GRID_GAP }]} onLayout={onGridLayout}>
                {tileSize > 0
                  ? visibleAssets.map((asset) => (
                      <AssetTile
                        key={asset.id}
                        asset={asset}
                        t={t}
                        lang={state.language}
                        size={tileSize}
                        compact={columns === 3}
                        onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
                      />
                    ))
                  : null}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
              <Text style={styles.emptyBody}>{t.emptyBody}</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <PrimaryButton label={t.addAsset} onPress={() => navigation.navigate('AddEditAsset')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.account}
            onPress={() => navigation.navigate('Account')}
            style={({ pressed }) => [styles.profileRow, pressed && styles.profilePressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(email?.[0] ?? 'S').toUpperCase()}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileLabel}>{emailVerified ? `✅ ${t.emailVerified}` : t.emailUnverified}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
              {!emailVerified && <Text style={styles.verificationHint}>{t.verifyForSync}</Text>}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Copyright />
        </View>
      </View>
      <WhatsNewModal visible={whatsNewOpen} onClose={closeWhatsNew} language={state.language} />
    </SafeAreaView>
  );
}

function LegendFilter({
  color,
  label,
  outlined,
  selected,
  filtering,
  onPress,
}: {
  color: string;
  label: string;
  outlined?: boolean;
  selected: boolean;
  filtering: boolean;
  onPress: () => void;
}) {
  // Default (nothing filtered): all four look normal. While filtering: chosen ones are boxed, the rest fade.
  const boxed = filtering && selected;
  const faded = filtering && !selected;
  return (
    <Pressable
      role="checkbox"
      aria-label={label}
      aria-checked={selected}
      onPress={onPress}
      hitSlop={4}
      style={[styles.legendItem, boxed && styles.legendItemOn, faded && styles.legendItemOff]}
    >
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color },
          outlined && styles.legendSwatchOutlined,
        ]}
      />
      <Text style={[styles.legendLabel, boxed && styles.legendLabelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  mark: { fontSize: 22, fontWeight: '500', color: colors.text, letterSpacing: -0.3 },
  langRow: { flexDirection: 'row', gap: 14 },
  lang: { fontSize: 13, color: colors.muted },
  langOn: { color: colors.text, textDecorationLine: 'underline' },
  syncBanner: {
    marginBottom: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  syncBannerText: { fontSize: 14, fontWeight: '500', color: colors.text },
  syncBannerSub: { marginTop: 4, fontSize: 12, color: colors.muted, lineHeight: 18 },
  scroll: { flex: 1 },
  legend: { flexDirection: 'row', gap: 4, marginBottom: spacing.sm },
  legendItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendItemOn: { borderColor: colors.text, backgroundColor: colors.surface },
  legendItemOff: { opacity: 0.4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendSwatchOutlined: { borderWidth: 1, borderColor: colors.line },
  legendLabel: { fontSize: 10, color: colors.muted, textAlign: 'center' },
  legendLabelOn: { color: colors.text, fontWeight: '600' },
  showAll: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  showAllText: { fontSize: 12, color: colors.muted, textDecorationLine: 'underline' },
  filterEmpty: { paddingVertical: spacing.lg },
  verificationHint: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { paddingTop: spacing.xl },
  emptyTitle: { fontSize: 18, color: colors.text },
  emptyBody: { marginTop: 8, fontSize: 15, color: colors.muted, lineHeight: 22 },
  footer: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
    gap: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  profilePressed: { opacity: 0.7, backgroundColor: '#F0EBE3' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 14, fontWeight: '600', color: colors.text },
  profileText: { flex: 1 },
  profileLabel: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  profileEmail: { marginTop: 2, fontSize: 14, color: colors.text, fontWeight: '500' },
  chevron: { fontSize: 22, color: colors.muted, lineHeight: 24 },
});
