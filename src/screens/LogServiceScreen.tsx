import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { pickImage } from '../data/pickImage';
import { DEFAULT_INTERVALS } from '../data/seed';
import { addDaysIso, todayIso } from '../domain/status';
import { ServiceLogKind } from '../domain/types';
import { dictionaries } from '../i18n/strings';
import { formatInt, parseNumber } from '../domain/format';
import { DateField } from '../components/DateField';
import { MonthQuickPick } from '../components/MonthQuickPick';
import { PrimaryButton } from '../components/PrimaryButton';
import { ServiceKindPicker } from '../components/ServiceKindPicker';
import { TappablePhoto } from '../components/TappablePhoto';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { VendorPicker } from '../components/VendorPicker';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LogService'>;

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

  const suggestedNext = useMemo(() => {
    if (!asset) return servicedAt;
    const days = DEFAULT_INTERVALS[asset.type]?.days ?? 180;
    return addDaysIso(servicedAt, days);
  }, [asset, servicedAt]);

  const [nextServiceAt, setNextServiceAt] = useState(suggestedNext);
  const [usageNextDue, setUsageNextDue] = useState(
    asset?.usageEnabled && asset.usageCurrent != null && asset.usageInterval != null
      ? String(asset.usageCurrent + asset.usageInterval)
      : ''
  );

  const tracksDate = asset?.scheduleByDate !== false;
  const tracksKm = !!asset?.usageEnabled;
  const showScheduleFields = serviceKind === 'routine';

  const canSave = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(servicedAt)) return false;
    if (serviceKind !== 'routine') return true;
    if (tracksDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextServiceAt)) return false;
    if (tracksKm && parseNumber(usageNextDue) == null) return false;
    return true;
  }, [servicedAt, serviceKind, tracksDate, tracksKm, nextServiceAt, usageNextDue]);

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
        <NumberField
          label={t.nextKmDue}
          lang={state.language}
          value={usageNextDue}
          onChangeDigits={setUsageNextDue}
          required
        />
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
  block: { marginTop: spacing.md, marginBottom: spacing.sm },
  receipt: { marginTop: 8 },
  actions: { marginTop: spacing.lg, gap: 10 },
});
