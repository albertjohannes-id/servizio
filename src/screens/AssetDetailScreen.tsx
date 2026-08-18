import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { brandModelLine, formatInt, formatKm, parseNumber, yearLine } from '../domain/format';
import { TYPE_IMAGES } from '../data/typeImages';
import { daysUntil, formatDate, formatDateTime, resolveServiceStatus } from '../domain/status';
import { AssetChange, ChangeField } from '../domain/types';
import { Dictionary, dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { NumberField } from '../components/NumberField';
import { ConditionPicker } from '../components/ConditionPicker';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AssetDetail'>;
type HistoryTab = 'service' | 'changes';

const FIELD_LABEL: Record<ChangeField, keyof Dictionary> = {
  km: 'fieldKm',
  condition: 'fieldCondition',
  nextServiceAt: 'fieldNextDue',
  name: 'fieldName',
  brand: 'fieldBrand',
  model: 'fieldModel',
  manufactureYear: 'fieldManufactureYear',
  purchaseYear: 'fieldPurchaseYear',
  usageNextDue: 'fieldUsageNextDue',
  usageInterval: 'fieldUsageInterval',
  usageEnabled: 'fieldUsageEnabled',
  in_service: 'fieldInService',
};

function formatChangeValue(
  field: ChangeField,
  value: AssetChange['oldValue'],
  t: Dictionary,
  lang: 'en' | 'id'
): string {
  if (value == null || value === '') return t.valueEmpty;
  if (field === 'km' || field === 'usageNextDue' || field === 'usageInterval') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? formatKm(n, lang) : String(value);
  }
  if (field === 'condition' && (value === 'working' || value === 'needs_attention' || value === 'not_working')) {
    return t[value];
  }
  if (field === 'nextServiceAt' && typeof value === 'string') return formatDate(value);
  if (field === 'usageEnabled') return value ? t.valueOn : t.valueOff;
  if (field === 'in_service') return t.in_service;
  return String(value);
}

export function AssetDetailScreen({ navigation, route }: Props) {
  const { state, setCondition, setInService, updateUsage, logsFor, changesFor } = useAssets();
  const t = dictionaries[state.language];
  const asset = state.assets.find((a) => a.id === route.params.assetId && !a.archived);
  const [kmDraft, setKmDraft] = useState(
    asset?.usageCurrent != null ? String(asset.usageCurrent) : ''
  );
  const [tab, setTab] = useState<HistoryTab>('service');

  if (!asset) {
    return (
      <View style={styles.center}>
        <Text>{t.cancel}</Text>
        <PrimaryButton label={t.cancel} variant="ghost" onPress={() => navigation.navigate('Home')} />
      </View>
    );
  }

  const service = resolveServiceStatus(asset);
  const logs = logsFor(asset.id);
  const changes = changesFor(asset.id);
  const days = daysUntil(asset.nextServiceAt);
  const dueNote =
    service === 'overdue'
      ? t.daysLate.replace('{n}', formatInt(Math.abs(days), state.language))
      : service === 'due_soon'
        ? t.dueInDays.replace('{n}', formatInt(Math.max(days, 0), state.language))
        : formatDate(asset.nextServiceAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={TYPE_IMAGES[asset.type]} style={styles.heroImage} resizeMode="contain" />
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{t[asset.type]}</Text>
          <Text style={styles.title}>{asset.name}</Text>
          {brandModelLine(asset) ? <Text style={styles.spec}>{brandModelLine(asset)}</Text> : null}
          {yearLine(asset) ? <Text style={styles.spec}>{yearLine(asset)}</Text> : null}
          <Text style={styles.due}>
            {t[service]} · {dueNote}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>{t.condition}</Text>
      <ConditionPicker value={asset.condition} onChange={(next) => setCondition(asset.id, next)} t={t} />

      {asset.usageEnabled ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t.currentKm}</Text>
          <View style={styles.kmRow}>
            <View style={styles.kmField}>
              <NumberField lang={state.language} value={kmDraft} onChangeDigits={setKmDraft} />
            </View>
            <PrimaryButton
              label={t.updateKm}
              variant="ghost"
              onPress={() => {
                const n = parseNumber(kmDraft);
                if (n == null) {
                  Alert.alert('Invalid km');
                  return;
                }
                if (asset.usageCurrent === n) return;
                updateUsage(asset.id, n);
                setTab('changes');
              }}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {service !== 'in_service' ? (
          <PrimaryButton label={t.markInService} variant="ghost" onPress={() => setInService(asset.id)} />
        ) : null}
        <PrimaryButton
          label={t.logServiceNow}
          onPress={() => navigation.navigate('LogService', { assetId: asset.id })}
        />
        <PrimaryButton
          label={t.edit}
          variant="ghost"
          onPress={() => navigation.navigate('AddEditAsset', { assetId: asset.id })}
        />
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('service')}
          style={[styles.tab, tab === 'service' && styles.tabOn]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'service' }}
        >
          <Text style={[styles.tabLabel, tab === 'service' && styles.tabLabelOn]}>{t.tabService}</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('changes')}
          style={[styles.tab, tab === 'changes' && styles.tabOn]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'changes' }}
        >
          <Text style={[styles.tabLabel, tab === 'changes' && styles.tabLabelOn]}>{t.tabChanges}</Text>
        </Pressable>
      </View>

      {tab === 'service' ? (
        logs.length === 0 ? (
          <Text style={styles.meta}>{t.noHistory}</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.history}>
              <Text style={styles.historyDate}>{formatDate(log.servicedAt)}</Text>
              {log.notes ? <Text style={styles.meta}>{log.notes}</Text> : null}
              {log.cost != null ? (
                <Text style={styles.meta}>{formatInt(log.cost, state.language)}</Text>
              ) : null}
              {log.vendorName ? <Text style={styles.meta}>{log.vendorName}</Text> : null}
              {log.receiptUri ? <Image source={{ uri: log.receiptUri }} style={styles.thumb} /> : null}
              {log.serviceTagUri ? (
                <Image source={{ uri: log.serviceTagUri }} style={styles.thumb} />
              ) : null}
            </View>
          ))
        )
      ) : changes.length === 0 ? (
        <Text style={styles.meta}>{t.noChanges}</Text>
      ) : (
        changes.map((change) => (
          <View key={change.id} style={styles.history}>
            <Text style={styles.changeField}>{t[FIELD_LABEL[change.field]]}</Text>
            <Text style={styles.historyDate}>
              {t.changeArrow
                .replace('{old}', formatChangeValue(change.field, change.oldValue, t, state.language))
                .replace('{new}', formatChangeValue(change.field, change.newValue, t, state.language))}
            </Text>
            <Text style={styles.meta}>{formatDateTime(change.createdAt)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  heroImage: { width: 88, height: 88 },
  heroCopy: { flex: 1 },
  kicker: { fontSize: 13, color: colors.muted },
  title: { fontSize: 26, fontWeight: '500', color: colors.text, letterSpacing: -0.4, marginTop: 2 },
  spec: { marginTop: 4, fontSize: 15, color: colors.text },
  due: { marginTop: 6, fontSize: 15, color: colors.muted },
  label: {
    marginTop: spacing.lg,
    marginBottom: 6,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  block: { marginTop: spacing.sm },
  kmRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kmField: { flex: 1 },
  actions: { marginTop: spacing.lg, gap: 10 },
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabOn: { borderBottomColor: colors.text },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  tabLabelOn: { color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: 2 },
  history: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  historyDate: { fontSize: 16, color: colors.text },
  changeField: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  thumb: { width: '100%', height: 140, marginTop: 8, backgroundColor: colors.border },
});
