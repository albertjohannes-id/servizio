import React, { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { TYPE_IMAGES } from '../data/typeImages';
import { brandModelLine } from '../domain/format';
import { dictionaries } from '../i18n/strings';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ArchivedAssets'>;

export function ArchivedAssetsScreen(_props: Props) {
  const { state, restoreAsset, permanentlyDeleteAsset } = useAssets();
  const t = dictionaries[state.language];
  const archived = useMemo(
    () => state.assets.filter((a) => a.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.assets]
  );

  const confirmDelete = (id: string, name: string) => {
    const body = t.deleteForeverBody.replace('{name}', name);
    const run = () => permanentlyDeleteAsset(id);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(body)) run();
      return;
    }
    Alert.alert(t.deleteForeverTitle, body, [
      { text: t.cancel, style: 'cancel' },
      { text: t.deleteForever, style: 'destructive', onPress: run },
    ]);
  };

  return (
    <FlatList
      style={styles.list}
      data={archived}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t.archivedEmptyTitle}</Text>
          <Text style={styles.emptyBody}>{t.archivedEmptyBody}</Text>
        </View>
      }
      ListHeaderComponent={
        archived.length ? <Text style={styles.lead}>{t.archivedLead}</Text> : null
      }
      renderItem={({ item }) => {
        const spec = brandModelLine(item);
        return (
          <View style={styles.row}>
            <Image source={TYPE_IMAGES[item.type]} style={styles.thumb} resizeMode="contain" />
            <View style={styles.body}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {spec ? `${spec} · ` : ''}
                {t[item.type]}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => restoreAsset(item.id)}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.restore}>{t.restoreAsset}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmDelete(item.id, item.name)}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.delete}>{t.deleteForever}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  lead: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 14, color: colors.muted, lineHeight: 20 },
  empty: { paddingTop: spacing.xl },
  emptyTitle: { fontSize: 18, color: colors.text, fontWeight: '500' },
  emptyBody: { marginTop: 8, fontSize: 15, color: colors.muted, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  thumb: { width: 52, height: 52 },
  body: { flex: 1 },
  name: { fontSize: 17, fontWeight: '500', color: colors.text },
  meta: { marginTop: 3, fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  actionBtn: { paddingVertical: 4 },
  pressed: { opacity: 0.55 },
  restore: { fontSize: 14, fontWeight: '500', color: colors.text, textDecorationLine: 'underline' },
  delete: { fontSize: 14, fontWeight: '500', color: colors.danger, textDecorationLine: 'underline' },
});
