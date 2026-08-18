import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { pickImage } from '../data/pickImage';
import { DEFAULT_INTERVALS } from '../data/seed';
import { addDaysIso, todayIso } from '../domain/status';
import { dictionaries } from '../i18n/strings';
import { formatInt, parseNumber } from '../domain/format';
import { DateField } from '../components/DateField';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { VendorPicker } from '../components/VendorPicker';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LogService'>;
type Method = 'choose' | 'tag' | 'manual';

const METHOD_IMAGES = {
  tag: require('../../assets/log/method-tag.png'),
  manual: require('../../assets/log/method-manual.png'),
};

export function LogServiceScreen({ navigation, route }: Props) {
  const { state, logService, addVendor } = useAssets();
  const t = dictionaries[state.language];
  const asset = state.assets.find((a) => a.id === route.params.assetId);
  const [method, setMethod] = useState<Method>(route.params.fromTag ? 'tag' : 'choose');

  const suggestedNext = useMemo(() => {
    if (!asset) return todayIso();
    const days = DEFAULT_INTERVALS[asset.type]?.days ?? 180;
    return addDaysIso(todayIso(), days);
  }, [asset]);

  const [servicedAt, setServicedAt] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [serviceTagUri, setServiceTagUri] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState('');
  const [nextServiceAt, setNextServiceAt] = useState(suggestedNext);
  const [usageNextDue, setUsageNextDue] = useState(
    asset?.usageEnabled && asset.usageCurrent != null && asset.usageInterval != null
      ? String(asset.usageCurrent + asset.usageInterval)
      : ''
  );

  if (!asset) {
    return (
      <View style={styles.center}>
        <Text>Asset not found</Text>
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
      notes: notes.trim(),
      cost: parseNumber(cost),
      receiptUri,
      serviceTagUri: method === 'tag' ? serviceTagUri : null,
      vendorId: vid,
      vendorName: vname,
      nextServiceAt,
      usageNextDue: asset.usageEnabled ? parseNumber(usageNextDue) ?? asset.usageNextDue : asset.usageNextDue,
    });
    navigation.navigate('AssetDetail', { assetId: asset.id });
  };

  const attachTag = async (camera: boolean) => {
    const uri = await pickImage(camera);
    if (uri) setServiceTagUri(uri);
  };

  if (method === 'choose') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t.logServiceNow}</Text>
        <Text style={styles.lead}>{asset.name}</Text>
        <Text style={styles.question}>{t.howToLog}</Text>

        <Pressable
          style={styles.choice}
          onPress={() => setMethod('tag')}
          accessibilityRole="button"
          accessibilityLabel={t.logByTag}
        >
          <Image source={METHOD_IMAGES.tag} style={styles.choiceImage} resizeMode="contain" />
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceTitle}>{t.logByTag}</Text>
            <Text style={styles.choiceBody}>{t.logByTagHint}</Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.choice}
          onPress={() => setMethod('manual')}
          accessibilityRole="button"
          accessibilityLabel={t.logByHand}
        >
          <Image source={METHOD_IMAGES.manual} style={styles.choiceImage} resizeMode="contain" />
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceTitle}>{t.logByHand}</Text>
            <Text style={styles.choiceBody}>{t.logByHandHint}</Text>
          </View>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{asset.name}</Text>
      <Pressable onPress={() => setMethod('choose')} hitSlop={8}>
        <Text style={styles.change}>{t.changeMethod}</Text>
      </Pressable>

      {method === 'tag' ? (
        <View style={styles.block}>
          <Text style={styles.section}>{t.serviceTag}</Text>
          <Text style={styles.hint}>{t.serviceTagHint}</Text>
          {serviceTagUri ? (
            <Image source={{ uri: serviceTagUri }} style={styles.tagPhoto} />
          ) : (
            <Pressable style={styles.well} onPress={() => void attachTag(Platform.OS !== 'web')}>
              <Text style={styles.wellTitle}>{t.addTagPhoto}</Text>
              <Text style={styles.wellBody}>{t.addTagPhotoHint}</Text>
            </Pressable>
          )}
          <View style={styles.row}>
            {Platform.OS !== 'web' ? (
              <PrimaryButton label={t.takeTagPhoto} variant="ghost" onPress={() => void attachTag(true)} />
            ) : null}
            <PrimaryButton label={t.pickTagPhoto} variant="ghost" onPress={() => void attachTag(false)} />
          </View>
        </View>
      ) : null}

      <DateField label={t.serviceDate} value={servicedAt} onChange={setServicedAt} />
      <DateField label={t.nextDuePrompt} value={nextServiceAt} onChange={setNextServiceAt} />

      {asset.usageEnabled ? (
        <NumberField
          label={t.nextKmDue}
          lang={state.language}
          value={usageNextDue}
          onChangeDigits={setUsageNextDue}
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
        {receiptUri ? <Image source={{ uri: receiptUri }} style={styles.receipt} /> : null}
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
        <PrimaryButton label={t.save} onPress={onSave} />
        <PrimaryButton label={t.cancel} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '500', color: colors.text, letterSpacing: -0.3 },
  lead: { marginTop: 6, fontSize: 16, color: colors.muted },
  question: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: 16, color: colors.text },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  choiceImage: { width: 88, height: 88 },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  choiceBody: { marginTop: 6, fontSize: 14, color: colors.muted, lineHeight: 20 },
  change: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  block: { marginTop: spacing.md, marginBottom: spacing.sm },
  section: { fontSize: 16, color: colors.text, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 4 },
  well: {
    marginTop: 12,
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  wellTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  wellBody: { marginTop: 6, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  label: {
    marginTop: spacing.md,
    marginBottom: 8,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: { marginTop: 8, gap: 4 },
  tagPhoto: { width: '100%', height: 180, marginTop: 12, backgroundColor: colors.border },
  receipt: { width: '100%', height: 140, marginTop: 8, backgroundColor: colors.border },
  actions: { marginTop: spacing.lg, gap: 10 },
});
