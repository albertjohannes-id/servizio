import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssets } from '../data/AssetContext';
import { brandModelLine, formatInt, formatKm, yearLine } from '../domain/format';
import { TYPE_IMAGES } from '../data/typeImages';
import { formatDate, formatDateTime, maintenanceSummary, resolveServiceStatus } from '../domain/status';
import { AssetChange, ChangeField, ServiceLog } from '../domain/types';
import { Dictionary, dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { TappablePhoto } from '../components/TappablePhoto';
import { ConditionPicker } from '../components/ConditionPicker';
import { LocationPicker } from '../components/LocationPicker';
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
  scheduleByDate: 'fieldScheduleByDate',
  location: 'fieldLocation',
  in_service: 'fieldLocation',
};

function fieldLabel(field: ChangeField, t: Dictionary): string {
  const key = FIELD_LABEL[field];
  return key ? t[key] : field;
}

function formatChangeValue(
  field: ChangeField,
  value: AssetChange['oldValue'],
  t: Dictionary,
  lang: 'en' | 'id'
): string {
  if (value == null || value === '') {
    if (field === 'in_service' || field === 'location') return t.locationHome;
    return t.valueEmpty;
  }
  if (field === 'km' || field === 'usageNextDue' || field === 'usageInterval') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? formatKm(n, lang) : String(value);
  }
  if (field === 'condition' && (value === 'working' || value === 'needs_attention' || value === 'not_working')) {
    return t[value];
  }
  if (field === 'nextServiceAt' && typeof value === 'string') return formatDate(value);
  if (field === 'usageEnabled' || field === 'scheduleByDate') return value ? t.valueOn : t.valueOff;
  if (field === 'location' || field === 'in_service') {
    if (value === 'service_center' || value === 'in_service') return t.locationServiceCenter;
    return t.locationHome;
  }
  return String(value);
}

export function AssetDetailScreen({ navigation, route }: Props) {
  const {
    state,
    setCondition,
    setLocation,
    restoreAsset,
    permanentlyDeleteAsset,
    logsFor,
    changesFor,
  } = useAssets();
  const t = dictionaries[state.language];
  const asset = state.assets.find((a) => a.id === route.params.assetId);
  const [tab, setTab] = useState<HistoryTab>('service');
  const [savedVisible, setSavedVisible] = useState(!!route.params.showSaved);
  const [openLog, setOpenLog] = useState<ServiceLog | null>(null);
  const [openChange, setOpenChange] = useState<AssetChange | null>(null);

  React.useEffect(() => {
    if (savedVisible) {
      const timer = setTimeout(() => setSavedVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [savedVisible]);

  if (!asset) {
    return (
      <View style={styles.center}>
        <Text>{t.cancel}</Text>
        <PrimaryButton label={t.cancel} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const service = resolveServiceStatus(asset);
  const logs = logsFor(asset.id);
  const changes = changesFor(asset.id);
  const maint = maintenanceSummary(asset, t, state.language);
  const dueNote = maint.primary;

  const confirmRestore = () => {
    const body = t.restoreConfirmBody.replace('{name}', asset.name);
    const run = () => {
      restoreAsset(asset.id);
      navigation.navigate('Home');
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(body)) run();
      return;
    }
    Alert.alert(t.restoreConfirmTitle, body, [
      { text: t.cancel, style: 'cancel' },
      { text: t.restoreAsset, onPress: run },
    ]);
  };

  const confirmDelete = () => {
    const body = t.deleteForeverBody.replace('{name}', asset.name);
    const run = () => {
      permanentlyDeleteAsset(asset.id);
      navigation.navigate('ArchivedAssets');
    };
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {savedVisible ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{t.saved}</Text>
        </View>
      ) : null}
      {asset.archived ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t.archivedBanner}</Text>
        </View>
      ) : null}

      <View style={styles.hero}>
        <Image source={TYPE_IMAGES[asset.type]} style={styles.heroImage} resizeMode="contain" />
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{t[asset.type]}</Text>
          <Text style={styles.title}>{asset.name}</Text>
          {brandModelLine(asset) ? <Text style={styles.spec}>{brandModelLine(asset)}</Text> : null}
          {yearLine(asset) ? <Text style={styles.spec}>{yearLine(asset)}</Text> : null}
          {asset.usageEnabled && asset.usageCurrent != null ? (
            <Text style={styles.spec}>{formatKm(asset.usageCurrent, state.language)}</Text>
          ) : null}
          <Text style={styles.due}>
            {t[service]} · {dueNote}
            {asset.location === 'service_center' ? ` · ${t.locationServiceCenter}` : ''}
          </Text>
        </View>
      </View>

      {asset.archived ? (
        <View style={styles.actions}>
          <PrimaryButton label={t.restoreAsset} onPress={confirmRestore} />
          <PrimaryButton label={t.deleteForever} variant="danger" onPress={confirmDelete} />
        </View>
      ) : (
        <>
          <Text style={styles.label}>{t.condition}</Text>
          <ConditionPicker value={asset.condition} onChange={(next) => setCondition(asset.id, next)} t={t} />

          <Text style={styles.label}>{t.location}</Text>
          <LocationPicker value={asset.location} onChange={(next) => setLocation(asset.id, next)} t={t} />

          <View style={styles.actions}>
            <PrimaryButton
              label={t.logServiceNow}
              onPress={() => navigation.navigate('LogService', { assetId: asset.id })}
            />
            {asset.usageEnabled ? (
              <PrimaryButton
                label={t.logKm}
                variant="ghost"
                onPress={() => navigation.navigate('LogKm', { assetId: asset.id })}
              />
            ) : null}
            <PrimaryButton
              label={t.edit}
              variant="ghost"
              onPress={() => navigation.navigate('AddEditAsset', { assetId: asset.id })}
            />
          </View>
        </>
      )}

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
            <Pressable
              key={log.id}
              onPress={() => setOpenLog(log)}
              accessibilityRole="button"
              accessibilityLabel={`${t.tabService} ${formatDate(log.servicedAt)}`}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{formatDate(log.servicedAt)}</Text>
                {log.cost != null ? (
                  <Text style={styles.cardCost}>{formatInt(log.cost, state.language)}</Text>
                ) : null}
              </View>
              {log.vendorName ? <Text style={styles.cardSub}>{log.vendorName}</Text> : null}
              <Text style={styles.cardSub}>
                {log.serviceKind === 'one_time' ? t.serviceKindOneTime : t.serviceKindRoutine}
              </Text>
              {log.notes ? (
                <Text style={styles.cardNotes} numberOfLines={2}>
                  {log.notes}
                </Text>
              ) : null}
              <Text style={styles.cardHint}>{t.tapForDetails}</Text>
            </Pressable>
          ))
        )
      ) : changes.length === 0 ? (
        <Text style={styles.meta}>{t.noChanges}</Text>
      ) : (
        changes.map((change) => (
          <Pressable
            key={change.id}
            onPress={() => setOpenChange(change)}
            accessibilityRole="button"
            accessibilityLabel={fieldLabel(change.field, t)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.changeField}>{fieldLabel(change.field, t)}</Text>
            <View style={styles.fromTo}>
              <View style={styles.fromToCol}>
                <Text style={styles.fromToLabel}>{t.changeFrom}</Text>
                <Text style={styles.fromToValue}>
                  {formatChangeValue(change.field, change.oldValue, t, state.language)}
                </Text>
              </View>
              <Text style={styles.fromToArrow}>→</Text>
              <View style={styles.fromToCol}>
                <Text style={styles.fromToLabel}>{t.changeTo}</Text>
                <Text style={styles.fromToValue}>
                  {formatChangeValue(change.field, change.newValue, t, state.language)}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{formatDateTime(change.createdAt)}</Text>
          </Pressable>
        ))
      )}

      <Modal
        visible={!!openLog || !!openChange}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOpenLog(null);
          setOpenChange(null);
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            setOpenLog(null);
            setOpenChange(null);
          }}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            {openLog ? (
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetInner}>
                <Text style={styles.sheetKicker}>{t.serviceDate}</Text>
                <Text style={styles.sheetTitle}>{formatDate(openLog.servicedAt)}</Text>
                <View style={styles.sheetBlock}>
                  <DetailRow
                    label={t.serviceKind}
                    value={openLog.serviceKind === 'one_time' ? t.serviceKindOneTime : t.serviceKindRoutine}
                  />
                  <DetailRow label={t.vendor} value={openLog.vendorName} />
                  <DetailRow
                    label={t.costShort}
                    value={openLog.cost != null ? formatInt(openLog.cost, state.language) : t.noCost}
                  />
                  <DetailRow label={t.notes} value={openLog.notes?.trim() ? openLog.notes : t.noNotes} />
                  <DetailRow label={t.loggedAt} value={formatDateTime(openLog.createdAt)} />
                </View>
                {openLog.receiptUri ? (
                  <View style={styles.photoBlock}>
                    <Text style={styles.detailLabel}>{t.receipt}</Text>
                    <TappablePhoto uri={openLog.receiptUri} style={styles.sheetPhoto} accessibilityLabel={t.receipt} />
                  </View>
                ) : null}
                {openLog.serviceTagUri ? (
                  <View style={styles.photoBlock}>
                    <Text style={styles.detailLabel}>{t.serviceTag}</Text>
                    <TappablePhoto uri={openLog.serviceTagUri} style={styles.sheetPhoto} accessibilityLabel={t.serviceTag} />
                  </View>
                ) : null}
                <PrimaryButton
                  label={t.done}
                  onPress={() => {
                    setOpenLog(null);
                    setOpenChange(null);
                  }}
                />
              </ScrollView>
            ) : openChange ? (
              <View style={styles.sheetInner}>
                <Text style={styles.sheetKicker}>{t.tabChanges}</Text>
                <Text style={styles.sheetTitle}>{fieldLabel(openChange.field, t)}</Text>
                <View style={styles.sheetBlock}>
                  <DetailRow
                    label={t.changeFrom}
                    value={formatChangeValue(openChange.field, openChange.oldValue, t, state.language)}
                  />
                  <DetailRow
                    label={t.changeTo}
                    value={formatChangeValue(openChange.field, openChange.newValue, t, state.language)}
                  />
                  <DetailRow label={t.loggedAt} value={formatDateTime(openChange.createdAt)} />
                </View>
                <PrimaryButton
                  label={t.done}
                  onPress={() => {
                    setOpenLog(null);
                    setOpenChange(null);
                  }}
                />
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#DFF5E6',
    alignSelf: 'flex-start',
  },
  toastText: { fontSize: 14, fontWeight: '500', color: colors.ok },
  banner: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E8E6E0',
  },
  bannerText: { fontSize: 13, color: colors.muted, lineHeight: 18 },
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
  meta: { fontSize: 14, color: colors.muted, marginTop: 12 },
  card: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.75 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  cardCost: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardSub: { marginTop: 4, fontSize: 14, color: colors.muted },
  cardNotes: { marginTop: 6, fontSize: 14, color: colors.text, lineHeight: 20 },
  cardHint: { marginTop: 8, fontSize: 12, color: colors.muted },
  changeField: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,26,23,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  sheetScroll: { maxHeight: 520 },
  sheetInner: { padding: 18, gap: 12 },
  sheetKicker: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sheetTitle: { fontSize: 22, fontWeight: '600', color: colors.text, letterSpacing: -0.3 },
  sheetBlock: {
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  detailRow: { gap: 2 },
  detailLabel: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  detailValue: { fontSize: 16, color: colors.text, lineHeight: 22 },
  photoBlock: { gap: 6 },
  sheetPhoto: { width: '100%', height: 160, borderRadius: 8, backgroundColor: colors.border },
  fromTo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fromToCol: { flex: 1, gap: 2 },
  fromToLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fromToValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  fromToArrow: { marginTop: 16, fontSize: 16, color: colors.muted },
});
