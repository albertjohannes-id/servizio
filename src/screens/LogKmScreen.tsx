import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { DEFAULT_INTERVALS } from '../data/seed';
import { formatInt, formatKm, parseNumber } from '../domain/format';
import { dictionaries } from '../i18n/strings';
import { NumberField } from '../components/NumberField';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LogKm'>;

export function LogKmScreen({ navigation, route }: Props) {
  const { state, updateUsage } = useAssets();
  const t = dictionaries[state.language];
  const asset = state.assets.find((a) => a.id === route.params.assetId);

  const [km, setKm] = useState(asset?.usageCurrent != null ? String(asset.usageCurrent) : '');

  const parsed = parseNumber(km);
  const previous = asset?.usageCurrent ?? null;
  const kmCapable = asset != null && DEFAULT_INTERVALS[asset.type]?.km != null;

  const kmError = useMemo(() => {
    if (parsed == null) return null;
    if (parsed < 0) return t.kmInvalid;
    if (previous != null && parsed < previous) {
      return t.kmTooLow.replace('{n}', formatInt(previous, state.language));
    }
    return null;
  }, [parsed, previous, state.language, t.kmInvalid, t.kmTooLow]);

  const canSave = useMemo(() => {
    if (parsed == null || kmError) return false;
    if (previous != null && parsed === previous) return false;
    return true;
  }, [parsed, kmError, previous]);

  if (!asset) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t.assetNotFound}</Text>
        <PrimaryButton label={t.back} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (!kmCapable) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t.logKmNotEnabled}</Text>
        <PrimaryButton label={t.back} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const onSave = () => {
    if (parsed == null || kmError) return;
    updateUsage(asset.id, parsed);
    navigation.navigate('AssetDetail', { assetId: asset.id, showSaved: true });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.logKmNow}</Text>
      <Text style={styles.lead}>{asset.name}</Text>
      <Text style={styles.hint}>{asset.usageEnabled ? t.logKmLead : t.logKmLeadAny}</Text>
      <Text style={styles.requiredHint}>{t.requiredHint}</Text>

      {previous != null ? (
        <View style={styles.previousBlock}>
          <Text style={styles.previousLabel}>{t.previousKm}</Text>
          <Text style={styles.previousValue}>{formatKm(previous, state.language)}</Text>
        </View>
      ) : null}

      <NumberField
        label={t.newKm}
        required
        lang={state.language}
        value={km}
        onChangeDigits={setKm}
        placeholder={previous != null ? formatInt(previous, state.language) : '0'}
      />
      {kmError ? <Text style={styles.error}>{kmError}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton label={t.save} onPress={onSave} disabled={!canSave} />
        <PrimaryButton label={t.cancel} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: spacing.lg },
  notFound: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '500', color: colors.text, letterSpacing: -0.3 },
  lead: { marginTop: 6, fontSize: 16, color: colors.muted },
  hint: { marginTop: 8, fontSize: 14, color: colors.muted, lineHeight: 20 },
  requiredHint: { marginTop: spacing.md, marginBottom: 4, fontSize: 12, color: colors.muted },
  previousBlock: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  previousLabel: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  previousValue: { marginTop: 4, fontSize: 20, fontWeight: '600', color: colors.text },
  error: { marginTop: 8, fontSize: 13, color: colors.danger },
  actions: { marginTop: spacing.lg, gap: 10 },
});
