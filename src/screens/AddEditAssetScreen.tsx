import React, { useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { DEFAULT_INTERVALS, BRANDS_BY_TYPE, PURCHASE_AT_OPTIONS } from '../data/seed';
import { parseNumber } from '../domain/format';
import { addDaysIso, todayIso } from '../domain/status';
import { AssetType, AssetLocation, ConditionStatus } from '../domain/types';
import { Dictionary, dictionaries } from '../i18n/strings';
import { DateField } from '../components/DateField';
import { TypePicker } from '../components/TypePicker';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { SuggestField } from '../components/SuggestField';
import { YearPicker } from '../components/YearPicker';
import { SelectField } from '../components/SelectField';
import { LocationPicker } from '../components/LocationPicker';
import {
  ScheduleMode,
  ScheduleModePicker,
  scheduleModeFromAsset,
  scheduleModeToFlags,
} from '../components/ScheduleModePicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditAsset'>;

function namePlaceholderFor(type: AssetType, t: Dictionary): string {
  if (type === 'motorcycle') return t.namePlaceholder_motorcycle;
  if (type === 'bike') return t.namePlaceholder_bike;
  if (type === 'ac') return t.namePlaceholder_ac;
  if (type === 'water_heater') return t.namePlaceholder_water_heater;
  if (type === 'other') return t.namePlaceholder_other;
  return t.namePlaceholder_car;
}

function defaultModeForType(_type: AssetType): ScheduleMode {
  return 'none';
}

export function AddEditAssetScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { state, upsertAsset, archiveAsset } = useAssets();
  const t = dictionaries[state.language];
  const existing = state.assets.find((a) => a.id === route.params?.assetId);

  const scrollRef = useRef<ScrollView>(null);
  const remindersY = useRef<number | null>(null);
  const didScroll = useRef(false);
  const scrollToReminders = () => {
    if (route.params?.focusSection !== 'reminders' || remindersY.current == null || didScroll.current) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, remindersY.current! - 16), animated: true });
      didScroll.current = true;
    });
  };
  const [location, setLocation] = useState<AssetLocation>(existing?.location ?? 'home');

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerBackVisible: false, headerLeft: () => (
      <Pressable accessibilityRole="button" style={styles.headerAction} onPress={() => navigation.goBack()}>
        <Text style={styles.headerText}>{t.cancel}</Text>
      </Pressable>
    ) });
  }, [navigation, t.cancel]);

  const initialType = existing?.type ?? 'car';
  const typeDefault = DEFAULT_INTERVALS[initialType];
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AssetType>(initialType);
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [manufactureYear, setManufactureYear] = useState(
    existing?.manufactureYear != null ? String(existing.manufactureYear) : ''
  );
  const [purchaseYear, setPurchaseYear] = useState(
    existing?.purchaseYear != null ? String(existing.purchaseYear) : ''
  );
  const [purchaseAt, setPurchaseAt] = useState(existing?.purchaseAt ?? '');
  const [condition, setCondition] = useState<ConditionStatus>(existing?.condition ?? 'working');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(() =>
    existing ? scheduleModeFromAsset(existing, initialType) : defaultModeForType(initialType)
  );
  const [nextServiceAt, setNextServiceAt] = useState(
    existing?.nextServiceAt ?? addDaysIso(todayIso(), typeDefault.days)
  );
  const [usageCurrent, setUsageCurrent] = useState(
    existing?.usageCurrent != null ? String(existing.usageCurrent) : ''
  );
  const [usageInterval, setUsageInterval] = useState(
    existing?.usageInterval != null ? String(existing.usageInterval) : String(typeDefault.km ?? '5000')
  );
  const [usageNextDue, setUsageNextDue] = useState(
    existing?.usageNextDue != null ? String(existing.usageNextDue) : ''
  );

  const kmCapable = DEFAULT_INTERVALS[type]?.km != null;
  const { scheduleByDate, usageEnabled } = scheduleModeToFlags(scheduleMode, kmCapable);

  const brandOptions = useMemo(() => {
    const fromKind = BRANDS_BY_TYPE[type] ?? [];
    const fromAssets = state.assets
      .filter((a) => a.type === type && a.brand.trim())
      .map((a) => a.brand.trim());
    return [...new Set([...fromKind, ...fromAssets])];
  }, [type, state.assets]);

  const purchaseAtOptions = useMemo(() => {
    const fromAssets = state.assets
      .filter((a) => a.purchaseAt?.trim())
      .map((a) => a.purchaseAt.trim());
    return [...new Set([...PURCHASE_AT_OPTIONS, ...fromAssets])];
  }, [state.assets]);

  const yearOk = (raw: string) => {
    if (!raw.trim()) return true;
    const n = parseNumber(raw);
    const max = new Date().getFullYear() + 1;
    return n != null && n >= 1980 && n <= max;
  };

  const canSave = useMemo(() => {
    const base =
      name.trim().length > 0 &&
      brand.trim().length > 0 &&
      model.trim().length > 0 &&
      yearOk(manufactureYear) &&
      yearOk(purchaseYear);
    if (!base) return false;
    if (scheduleMode === 'none') return true;
    const intervalOk =
      !usageEnabled || (parseNumber(usageInterval) != null && parseNumber(usageInterval)! > 0);
    return (
      intervalOk &&
      (!scheduleByDate || /^\d{4}-\d{2}-\d{2}$/.test(nextServiceAt))
    );
  }, [
    name,
    brand,
    model,
    manufactureYear,
    purchaseYear,
    scheduleMode,
    scheduleByDate,
    usageEnabled,
    nextServiceAt,
    usageInterval,
  ]);

  const onTypeChange = (next: AssetType) => {
    setType(next);
    if (!existing) {
      const d = DEFAULT_INTERVALS[next];
      setScheduleMode('none');
      setNextServiceAt(addDaysIso(todayIso(), d.days));
      if (d.km) setUsageInterval(String(d.km));
    } else if (scheduleMode === 'both' && !DEFAULT_INTERVALS[next]?.km) {
      setScheduleMode('date');
    } else if (scheduleMode === 'km' && !DEFAULT_INTERVALS[next]?.km) {
      setScheduleMode('date');
    }
  };

  const onSave = () => {
    const flags = scheduleModeToFlags(scheduleMode, kmCapable);
    const id = upsertAsset({
      id: existing?.id,
      name: name.trim(),
      type,
      brand: brand.trim(),
      model: model.trim(),
      manufactureYear: parseNumber(manufactureYear),
      purchaseYear: parseNumber(purchaseYear),
      purchaseAt: purchaseAt.trim(),
      condition,
      nextServiceAt,
      scheduleByDate: flags.scheduleByDate,
      usageEnabled: flags.usageEnabled,
      usageCurrent: flags.usageEnabled ? parseNumber(usageCurrent) : null,
      usageInterval: flags.usageEnabled ? parseNumber(usageInterval) : null,
      usageNextDue: flags.usageEnabled ? parseNumber(usageNextDue) : null,
      location,
    });
    navigation.replace('AssetDetail', { assetId: id });
  };

  return (
    <View style={styles.container}>
    <ScrollView ref={scrollRef} onContentSizeChange={scrollToReminders} keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t.assetDetails}</Text>
      <Text style={styles.requiredHint}>{t.requiredHint}</Text>

      <Text style={styles.label}>{t.kind}</Text>
      <TypePicker value={type} onChange={onTypeChange} t={t} />

      <TextField
        label={t.name}
        required
        value={name}
        onChangeText={setName}
        placeholder={namePlaceholderFor(type, t)}
      />

      <SuggestField
        label={t.brand}
        required
        value={brand}
        onChange={setBrand}
        options={brandOptions}
        placeholder={t.searchBrand}
        t={t}
        addNamed={t.addBrandNamed}
      />
      <TextField
        label={t.model}
        required
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
      <SuggestField
        label={t.purchaseAt}
        value={purchaseAt}
        onChange={setPurchaseAt}
        options={purchaseAtOptions}
        placeholder={t.purchaseAtPlaceholder}
        t={t}
        addNamed={t.searchPurchaseAt}
      />

      <Text style={styles.sectionTitle}>{t.conditionLocation}</Text>
      <SelectField label={t.condition} value={condition} onChange={setCondition}
        options={(['working', 'needs_attention', 'not_working'] as ConditionStatus[]).map((value) => ({ value, label: t[value] }))} />

      <Text style={styles.label}>{t.location}</Text>
      <LocationPicker value={location} onChange={setLocation} t={t} />

      <View onLayout={(event) => { remindersY.current = event.nativeEvent.layout.y; scrollToReminders(); }}>
        <Text style={styles.sectionTitle}>{t.reminders}</Text>
        <ScheduleModePicker dropdown type={type} value={scheduleMode} onChange={setScheduleMode} t={t} />
      </View>

      {scheduleByDate ? (
        <DateField label={t.nextDue} value={nextServiceAt} onChange={setNextServiceAt} required />
      ) : null}

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
            required
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
        {existing ? (
          <PrimaryButton
            label={t.archiveAsset}
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
                { text: t.archiveAsset, style: 'destructive', onPress: run },
              ]);
            }}
          />
        ) : null}
      </View>
    </ScrollView>
    <View style={[styles.bottomBar, { paddingBottom: Math.max(16, insets.bottom) }]}><PrimaryButton label={existing ? t.saveChanges : t.save} onPress={onSave} disabled={!canSave} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headerText: { fontSize: 15, color: colors.text },
  sectionTitle: { fontSize: 19, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 4 },
  bottomBar: { padding: 16, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  requiredHint: { marginTop: 8, marginBottom: 4, fontSize: 12, color: colors.muted },
  label: {
    marginTop: spacing.lg,
    marginBottom: 6,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  yearHint: { marginTop: spacing.md, fontSize: 13, color: colors.muted, lineHeight: 18 },
  actions: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: colors.line, gap: 10 },
});
