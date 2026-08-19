import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { DEFAULT_INTERVALS, BRANDS_BY_TYPE } from '../data/seed';
import { parseNumber } from '../domain/format';
import { addDaysIso, todayIso } from '../domain/status';
import { AssetType, ConditionStatus } from '../domain/types';
import { dictionaries } from '../i18n/strings';
import { DateField } from '../components/DateField';
import { TypePicker } from '../components/TypePicker';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { SuggestField } from '../components/SuggestField';
import { YearPicker } from '../components/YearPicker';
import { ConditionPicker } from '../components/ConditionPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditAsset'>;

export function AddEditAssetScreen({ navigation, route }: Props) {
  const { state, upsertAsset, archiveAsset } = useAssets();
  const t = dictionaries[state.language];
  const existing = state.assets.find((a) => a.id === route.params?.assetId);

  const defaults = DEFAULT_INTERVALS.car;
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AssetType>(existing?.type ?? 'car');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [manufactureYear, setManufactureYear] = useState(
    existing?.manufactureYear != null ? String(existing.manufactureYear) : ''
  );
  const [purchaseYear, setPurchaseYear] = useState(
    existing?.purchaseYear != null ? String(existing.purchaseYear) : ''
  );
  const [condition, setCondition] = useState<ConditionStatus>(existing?.condition ?? 'working');
  const [nextServiceAt, setNextServiceAt] = useState(
    existing?.nextServiceAt ?? addDaysIso(todayIso(), defaults.days)
  );
  const [usageEnabled, setUsageEnabled] = useState(existing?.usageEnabled ?? false);
  const [usageCurrent, setUsageCurrent] = useState(
    existing?.usageCurrent != null ? String(existing.usageCurrent) : ''
  );
  const [usageInterval, setUsageInterval] = useState(
    existing?.usageInterval != null ? String(existing.usageInterval) : '5000'
  );
  const [usageNextDue, setUsageNextDue] = useState(
    existing?.usageNextDue != null ? String(existing.usageNextDue) : ''
  );

  const brandOptions = useMemo(() => {
    const fromKind = BRANDS_BY_TYPE[type] ?? [];
    const fromAssets = state.assets
      .filter((a) => a.type === type && a.brand.trim())
      .map((a) => a.brand.trim());
    return [...new Set([...fromKind, ...fromAssets])];
  }, [type, state.assets]);

  const yearOk = (raw: string) => {
    if (!raw.trim()) return true;
    const n = parseNumber(raw);
    const max = new Date().getFullYear() + 1;
    return n != null && n >= 1980 && n <= max;
  };

  const canSave = useMemo(
    () =>
      name.trim().length > 0 &&
      brand.trim().length > 0 &&
      model.trim().length > 0 &&
      yearOk(manufactureYear) &&
      yearOk(purchaseYear) &&
      /^\d{4}-\d{2}-\d{2}$/.test(nextServiceAt),
    [name, brand, model, manufactureYear, purchaseYear, nextServiceAt]
  );

  const onTypeChange = (next: AssetType) => {
    setType(next);
    if (!existing) {
      const d = DEFAULT_INTERVALS[next];
      setNextServiceAt(addDaysIso(todayIso(), d.days));
      if (d.km) {
        setUsageEnabled(true);
        setUsageInterval(String(d.km));
      } else {
        setUsageEnabled(false);
      }
    }
  };

  const onSave = () => {
    const id = upsertAsset({
      id: existing?.id,
      name: name.trim(),
      type,
      brand: brand.trim(),
      model: model.trim(),
      manufactureYear: parseNumber(manufactureYear),
      purchaseYear: parseNumber(purchaseYear),
      condition,
      nextServiceAt,
      usageEnabled,
      usageCurrent: usageEnabled ? parseNumber(usageCurrent) : null,
      usageInterval: usageEnabled ? parseNumber(usageInterval) : null,
      usageNextDue: usageEnabled ? parseNumber(usageNextDue) : null,
      serviceOverride: existing?.serviceOverride ?? null,
    });
    navigation.replace('AssetDetail', { assetId: id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextField label={t.name} value={name} onChangeText={setName} placeholder="Family Car" />

      <Text style={styles.label}>{t.kind}</Text>
      <TypePicker value={type} onChange={onTypeChange} t={t} />

      <SuggestField
        label={t.brand}
        value={brand}
        onChange={setBrand}
        options={brandOptions}
        placeholder={t.searchBrand}
        t={t}
        addNamed={t.addBrandNamed}
      />
      <TextField
        label={t.model}
        value={model}
        onChangeText={setModel}
        placeholder={t.modelPlaceholder}
        autoCapitalize="words"
      />
      <Text style={styles.yearHint}>
        {type === 'car' || type === 'motorcycle' || type === 'bike' ? t.yearHintVehicle : t.yearHintHome}
      </Text>
      <YearPicker
        label={t.manufactureYear}
        value={manufactureYear}
        onChange={setManufactureYear}
        placeholder="2019"
      />
      <YearPicker
        label={t.purchaseYear}
        value={purchaseYear}
        onChange={setPurchaseYear}
        placeholder="2022"
      />

      <Text style={styles.label}>{t.condition}</Text>
      <ConditionPicker value={condition} onChange={setCondition} t={t} />

      <DateField label={t.nextDue} value={nextServiceAt} onChange={setNextServiceAt} />

      <View style={styles.switchRow}>
        <Text style={styles.labelInline}>{t.enableKm}</Text>
        <Switch value={usageEnabled} onValueChange={setUsageEnabled} />
      </View>

      {usageEnabled ? (
        <>
          <NumberField
            label={t.currentKm}
            lang={state.language}
            value={usageCurrent}
            onChangeDigits={setUsageCurrent}
          />
          <NumberField
            label={t.intervalKm}
            lang={state.language}
            value={usageInterval}
            onChangeDigits={setUsageInterval}
          />
          <NumberField
            label={t.nextKmDue}
            lang={state.language}
            value={usageNextDue}
            onChangeDigits={setUsageNextDue}
          />
        </>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label={t.save} onPress={onSave} disabled={!canSave} />
        <PrimaryButton label={t.cancel} variant="ghost" onPress={() => navigation.goBack()} />
        {existing ? (
          <PrimaryButton
            label={t.delete}
            variant="danger"
            onPress={() => {
              const run = () => {
                archiveAsset(existing.id);
                navigation.navigate('Home');
              };
              if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.confirm(t.archiveConfirmBody)) run();
                return;
              }
              Alert.alert(t.archiveConfirmTitle, t.archiveConfirmBody, [
                { text: t.cancel, style: 'cancel' },
                { text: t.delete, style: 'destructive', onPress: run },
              ]);
            }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  label: {
    marginTop: spacing.lg,
    marginBottom: 6,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelInline: { fontSize: 16, color: colors.text },
  yearHint: { marginTop: spacing.md, fontSize: 13, color: colors.muted, lineHeight: 18 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  actions: { marginTop: spacing.xl, gap: 10 },
});
