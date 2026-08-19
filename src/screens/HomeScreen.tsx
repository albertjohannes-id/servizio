import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { syncAssetReminders } from '../data/notifications';
import { resolveServiceStatus } from '../domain/status';
import { Asset, ServiceStatus } from '../domain/types';
import { Dictionary, dictionaries } from '../i18n/strings';
import { SectionHeader } from '../components/SectionHeader';
import { AssetRow } from '../components/AssetRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { Copyright } from '../components/Copyright';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type ListItem =
  | { key: string; kind: 'header'; title: string; status: ServiceStatus; count: number }
  | { key: string; kind: 'asset'; asset: Asset };

function buildList(assets: Asset[], t: Dictionary): ListItem[] {
  const order: { status: ServiceStatus; title: string }[] = [
    { status: 'overdue', title: t.sectionOverdue },
    { status: 'due_soon', title: t.sectionDueSoon },
    { status: 'in_service', title: t.sectionInService },
    { status: 'on_schedule', title: t.sectionOnTrack },
  ];
  const active = assets.filter((a) => !a.archived);
  const items: ListItem[] = [];
  for (const group of order) {
    const rows = active.filter((a) => resolveServiceStatus(a) === group.status);
    if (!rows.length) continue;
    items.push({
      key: `h-${group.status}`,
      kind: 'header',
      title: group.title,
      status: group.status,
      count: rows.length,
    });
    for (const asset of rows) {
      items.push({ key: asset.id, kind: 'asset', asset });
    }
  }
  return items;
}

export function HomeScreen({ navigation }: Props) {
  const { email } = useAuth();
  const { ready, state, setLanguage } = useAssets();
  const t = dictionaries[state.language];
  const insets = useSafeAreaInsets();
  const items = useMemo(() => buildList(state.assets, t), [state.assets, t]);

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

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 130 + insets.bottom }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
            <Text style={styles.emptyBody}>{t.emptyBody}</Text>
            <View style={styles.emptyCta}>
              <PrimaryButton label={t.addAsset} onPress={() => navigation.navigate('AddEditAsset')} />
            </View>
          </View>
        }
        renderItem={({ item, index }) =>
          item.kind === 'header' ? (
            <SectionHeader
              title={item.title}
              count={item.count}
              status={item.status}
              first={index === 0}
            />
          ) : (
            <AssetRow
              asset={item.asset}
              t={t}
              lang={state.language}
              onPress={() => navigation.navigate('AssetDetail', { assetId: item.asset.id })}
            />
          )
        }
      />

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
            <Text style={styles.profileLabel}>{t.account}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Copyright />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: spacing.lg,
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
  empty: { paddingTop: spacing.xl },
  emptyTitle: { fontSize: 18, color: colors.text },
  emptyBody: { marginTop: 8, fontSize: 15, color: colors.muted, lineHeight: 22 },
  emptyCta: { marginTop: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
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
