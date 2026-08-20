import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { pickImage } from '../data/pickImage';
import { DEFAULT_INTERVALS } from '../data/seed';
import { addDaysIso, isScheduleTracked, todayIso } from '../domain/status';
import { ServiceLogKind } from '../domain/types';
import { dictionaries } from '../i18n/strings';
import { formatInt, parseNumber } from '../domain/format';
import { DateField } from '../components/DateField';
import { MonthQuickPick } from '../components/MonthQuickPick';
import { PrimaryButton } from '../components/PrimaryButton';
import { ServiceKindPicker } from '../components/ServiceKindPicker';
import {
  ScheduleMode,
  ScheduleModePicker,
  scheduleModeFromAsset,
  scheduleModeToFlags,
} from '../components/ScheduleModePicker';
import { TappablePhoto } from '../components/TappablePhoto';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { VendorPicker } from '../components/VendorPicker';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LogService'>;

function suggestedModeForType(type: keyof typeof DEFAULT_INTERVALS): ScheduleMode {
  return DEFAULT_INTERVALS[type]?.km != null ? 'both' : 'date';
}

export function LogServiceScreen({ navigation, route }: Props) {
  const { state, logService, addVendor } = useAssets();
  const t = dictionaries[state.language];
  const asset = state.assets.find((a) => a.id === route.params.assetId);

  const [servicedAt, setServicedAt] = useState(todayIso());
  const [serviceKind, setServiceKind] = useState<ServiceLogKind>('routine');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState('');

  const untracked = asset != null && !isScheduleTracked(asset);
  const kmCapable = asset != null && DEFAULT_INTERVALS[asset.type]?.km != null;
  const typeDefault = asset ? DEFAULT_INTERVALS[asset.type] : DEFAULT_INTERVALS.other;

  const [setupMode, setSetupMode] = useState<ScheduleMode>(() =>
    asset ? (untracked ? suggestedModeForType(asset.type) : scheduleModeFromAsset(asset, asset.type)) : 'date'
  );
  const [usageInterval, setUsageInterval] = useState(String(typeDefault.km ?? '5000'));
  const [usageCurrent, setUsageCurrent] = useState(
    asset?.usageCurrent != null ? String(asset.usageCurrent) : ''
  );

  const suggestedNext = useMemo(() => {
    if (!asset) return servicedAt;
    const days = DEFAULT_INTERVALS[asset.type]?.days ?? 180;
    return addDaysIso(servicedAt, days);
  }, [asset, servicedAt]);

  const [nextServiceAt, setNextServiceAt] = useState(suggestedNext);
  const [usageNextDue, setUsageNextDue] = useState(() => {
    if (!asset?.usageEnabled || asset.usageCurrent == null || asset.usageInterval == null) return '';
    return String(asset.usageCurrent + asset.usageInterval);
  });

  React.useEffect(() => {
    if (!asset || !untracked || serviceKind !== 'routine') return;
    const interval = parseNumber(usageInterval) ?? typeDefault.km ?? 5000;
    const current = parseNumber(usageCurrent);
    if (current != null) setUsageNextDue(String(current + interval));
  }, [asset, untracked, serviceKind, usageCurrent, usageInterval, typeDefault.km]);

  const activeFlags = useMemo(() => {
    if (!asset) return { scheduleByDate: false, usageEnabled: false };
    if (untracked && serviceKind === 'routine') {
      return scheduleModeToFlags(setupMode, !!kmCapable);
    }
    return {
      scheduleByDate: asset.scheduleByDate !== false,
      usageEnabled: asset.usageEnabled,
    };
  }, [asset, untracked, serviceKind, setupMode, kmCapable]);

  const { scheduleByDate: tracksDate, usageEnabled: tracksKm } = activeFlags;
  const showScheduleFields = serviceKind === 'routine' && (untracked ? setupMode !== 'none' : true);
  const showSetupPicker = untracked && serviceKind === 'routine';

  const canSave = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(servicedAt)) return false;
    if (serviceKind !== 'routine') return true;
    if (untracked && setupMode === 'none') return false;
    if (tracksDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextServiceAt)) return false;
    if (tracksKm) {
      if (parseNumber(usageNextDue) == null) return false;
      if (untracked && (parseNumber(usageInterval) == null || parseNumber(usageInterval)! <= 0)) {
        return false;
      }
    }
    return true;
  }, [
    servicedAt,
    serviceKind,
    untracked,
    setupMode,
    tracksDate,
    tracksKm,
    nextServiceAt,
    usageNextDue,
    usageInterval,
  ]);

  if (!asset) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t.assetNotFound}</Text>
        <PrimaryButton label={t.back} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const onSave = () => {
    let vid = vendorId;
    let vname = state.vendors.find((v) => v.id === vendorId)?.name ?? null;
    const typed = newVendor.trim();
    if (!vid && typed) {
      const existingVendor = state.vendors.find(
        (v) => v.name.trim().toLowerCase() === typed.toLowerCase()
      );
      if (existingVendor) {
        vid = existingVendor.id;
        vname = existingVendor.name;
      } else {
        const v = addVendor(typed);
        vid = v.id;
        vname = v.name;
      }
    }

    const enablingSchedule = untracked && serviceKind === 'routine' && setupMode !== 'none';
    logService({
      assetId: asset.id,
      servicedAt,
      serviceKind,
      notes: notes.trim(),
      cost: parseNumber(cost),
      receiptUri,
      serviceTagUri: null,
      vendorId: vid,
      vendorName: vname,
      nextServiceAt: showScheduleFields && tracksDate ? nextServiceAt : undefined,
      usageNextDue:
        showScheduleFields && tracksKm ? parseNumber(usageNextDue) ?? asset.usageNextDue : undefined,
      scheduleByDate: enablingSchedule ? activeFlags.scheduleByDate : undefined,
      usageEnabled: enablingSchedule ? activeFlags.usageEnabled : undefined,
      usageInterval:
        enablingSchedule && tracksKm ? parseNumber(usageInterval) ?? asset.usageInterval : undefined,
      usageCurrent:
        enablingSchedule && tracksKm
          ? parseNumber(usageCurrent) ?? asset.usageCurrent
          : undefined,
    });
    navigation.navigate('AssetDetail', { assetId: asset.id, showSaved: true });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.logServiceNow}</Text>
      <Text style={styles.lead}>{asset.name}</Text>
      <Text style={styles.requiredHint}>{t.requiredHint}</Text>

      <DateField label={t.serviceDate} value={servicedAt} onChange={setServicedAt} required />

      <ServiceKindPicker value={serviceKind} onChange={setServiceKind} t={t} />

      {showSetupPicker ? (
        <View style={styles.setupBlock}>
          <Text style={styles.setupTitle}>{t.setupScheduleFromLog}</Text>
          <Text style={styles.setupHint}>{t.setupScheduleFromLogHint}</Text>
          <ScheduleModePicker type={asset.type} value={setupMode} onChange={setSetupMode} t={t} />
        </View>
      ) : null}

      {showScheduleFields && tracksDate ? (
        <View>
          <DateField
            label={t.nextDuePrompt}
            value={nextServiceAt}
            onChange={setNextServiceAt}
            required
          />
          <MonthQuickPick
            baseDate={servicedAt}
            selected={nextServiceAt}
            onSelect={setNextServiceAt}
            t={t}
          />
        </View>
      ) : null}

      {showScheduleFields && tracksKm ? (
        <>
          {untracked ? (
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
            </>
          ) : null}
          <NumberField
            label={t.nextKmDue}
            lang={state.language}
            value={usageNextDue}
            onChangeDigits={setUsageNextDue}
            required
          />
        </>
      ) : null}

      <TextField label={t.notes} value={notes} onChangeText={setNotes} multiline />
      <NumberField
        label={t.cost}
        lang={state.language}
        value={cost}
        onChangeDigits={setCost}
        placeholder={formatInt(350000, state.language)}
      />

      <View style={styles.block}>
        <PrimaryButton
          label={receiptUri ? t.receiptAttached : t.receipt}
          variant="ghost"
          onPress={async () => {
            const uri = await pickImage(false);
            if (uri) setReceiptUri(uri);
          }}
        />
        {receiptUri ? (
          <TappablePhoto uri={receiptUri} style={styles.receipt} accessibilityLabel={t.receipt} />
        ) : null}
      </View>

      <VendorPicker
        vendors={state.vendors}
        vendorId={vendorId}
        query={newVendor}
        onQuery={setNewVendor}
        onSelect={setVendorId}
        t={t}
      />

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
  notFound: { fontSize: 16, color: colors.muted },
  title: { fontSize: 24, fontWeight: '500', color: colors.text, letterSpacing: -0.3 },
  lead: { marginTop: 6, marginBottom: 4, fontSize: 16, color: colors.muted },
  requiredHint: { marginBottom: 4, fontSize: 12, color: colors.muted },
  setupBlock: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 4,
  },
  setupTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  setupHint: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 4 },
  block: { marginTop: spacing.md, marginBottom: spacing.sm },
  receipt: { marginTop: 8 },
  actions: { marginTop: spacing.lg, gap: 10 },
});
