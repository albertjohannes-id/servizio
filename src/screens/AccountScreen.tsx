import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { backupSummary, exportBackupFile, parseBackup, pickBackupFile } from '../data/backup';
import { syncStatusLabel } from '../data/syncStatusLabel';
import { dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { Copyright } from '../components/Copyright';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

const OTP_RESEND_COOLDOWN_SEC = 45;

function MenuRow({
  title,
  subtitle,
  onPress,
  danger,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuPressed]}
    >
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, danger && styles.menuDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      <Text style={[styles.chevron, danger && styles.menuDanger]}>›</Text>
    </Pressable>
  );
}

export function AccountScreen({ navigation }: Props) {
  const {
    email,
    lock,
    emailVerified,
    cloudLinked,
    startEmailVerification,
    confirmEmailVerification,
  } = useAuth();
  const {
    state,
    importState,
    setLanguage,
    setHomeColumns,
    syncStatus,
    syncMeta,
    lastSyncError,
    syncConflict,
    syncNow,
    resolveSyncKeepLocal,
    resolveSyncUseCloud,
  } = useAssets();
  const t = dictionaries[state.language];
  const [busy, setBusy] = useState<'export' | 'import' | 'verify' | 'sync' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devTaps, setDevTaps] = useState(0);
  const [verifyStep, setVerifyStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(0);
  const archivedCount = useMemo(
    () => state.assets.filter((a) => a.archived).length,
    [state.assets]
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const syncSubtitle = useMemo(
    () =>
      syncStatusLabel(syncStatus, syncMeta, t, {
        linked: cloudLinked,
        lastError: lastSyncError,
      }),
    [cloudLinked, lastSyncError, syncMeta, syncStatus, t]
  );

  const onExport = async () => {
    if (!email) return;
    setBusy('export');
    setMessage(null);
    try {
      await exportBackupFile(email, state);
      setMessage(t.exportDone);
    } catch {
      setMessage(t.exportFailed);
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    setBusy('import');
    setMessage(null);
    try {
      const raw = await pickBackupFile();
      const backup = parseBackup(raw);
      const summary = backupSummary(backup);
      const body = t.importConfirmBody
        .replace('{assets}', String(summary.assets))
        .replace('{logs}', String(summary.logs));
      const proceed = await new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(
            typeof window !== 'undefined'
              ? window.confirm(`${t.importConfirmTitle}\n\n${body}`)
              : false
          );
          return;
        }
        Alert.alert(t.importConfirmTitle, body, [
          { text: t.cancel, style: 'cancel', onPress: () => resolve(false) },
          { text: t.importBackup, onPress: () => resolve(true) },
        ]);
      });
      if (!proceed) return;
      await importState(backup.state);
      setMessage(t.importDone);
    } catch (err) {
      setMessage(err instanceof Error && err.message === 'No file selected' ? null : t.importFailed);
    } finally {
      setBusy(null);
    }
  };

  const onStartVerify = async () => {
    setBusy('verify');
    setMessage(null);
    const result = await startEmailVerification();
    setBusy(null);
    if (!result.ok) {
      setMessage(
        result.error === 'network_error'
          ? t.networkError
          : result.error === 'rate_limited'
            ? t.otpRateLimited
            : t.otpFailed
      );
      return;
    }
    setDevOtp(result.devOtp);
    setResendIn(OTP_RESEND_COOLDOWN_SEC);
    setVerifyStep(true);
  };

  const onResendVerify = async () => {
    if (busy || resendIn > 0) return;
    setBusy('verify');
    setMessage(null);
    const result = await startEmailVerification();
    setBusy(null);
    if (!result.ok) {
      setMessage(
        result.error === 'rate_limited' ? t.otpRateLimited : t.otpFailed
      );
      return;
    }
    setDevOtp(result.devOtp);
    setOtp('');
    setResendIn(OTP_RESEND_COOLDOWN_SEC);
    setMessage(t.otpResent);
  };

  const onConfirmVerify = async () => {
    if (!/^\d{6}$/.test(otp.trim())) return;
    setBusy('verify');
    setMessage(null);
    const result = await confirmEmailVerification(otp.trim());
    setBusy(null);
    if (!result.ok) {
      setMessage(
        result.error === 'otp_invalid'
          ? t.otpInvalid
          : result.error === 'otp_expired'
            ? t.otpExpired
            : t.otpFailed
      );
      return;
    }
    setVerifyStep(false);
    setOtp('');
    setDevOtp(undefined);
    setResendIn(0);
    setMessage(t.emailVerified);
    setBusy('sync');
    await syncNow();
    setBusy(null);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{(email?.[0] ?? 'S').toUpperCase()}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.hint}>
            {emailVerified ? t.emailVerified : t.emailUnverified}. {t.accountHint}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t.cloudSection}</Text>
      <View style={styles.group}>
        {!emailVerified ? (
          verifyStep ? (
            <View style={styles.verifyBox}>
              <TextField
                label={t.otpCode}
                required
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="123456"
              />
              <Text style={styles.menuSub}>{t.otpExpiresHint}</Text>
              {devOtp ? (
                <Text style={styles.menuSub}>{t.devOtpHint.replace('{code}', devOtp)}</Text>
              ) : null}
              <PrimaryButton
                label={t.verifyOtp}
                onPress={() => void onConfirmVerify()}
                loading={busy === 'verify'}
                disabled={busy === 'verify' || otp.trim().length !== 6}
              />
              <Pressable
                onPress={() => void onResendVerify()}
                disabled={busy === 'verify' || resendIn > 0}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.cancelLink,
                    (busy === 'verify' || resendIn > 0) && styles.linkDisabled,
                  ]}
                >
                  {resendIn > 0
                    ? t.resendOtpIn.replace('{n}', String(resendIn))
                    : t.resendOtp}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setVerifyStep(false);
                  setOtp('');
                  setResendIn(0);
                }}
                hitSlop={8}
              >
                <Text style={styles.cancelLink}>{t.cancel}</Text>
              </Pressable>
            </View>
          ) : (
            <MenuRow
              title={t.verifyEmail}
              subtitle={t.verifyEmailHint}
              onPress={() => {
                if (busy) return;
                void onStartVerify();
              }}
            />
          )
        ) : (
          <>
            <MenuRow
              title={t.syncNow}
              subtitle={syncSubtitle}
              onPress={() => {
                if (busy) return;
                setBusy('sync');
                void syncNow().finally(() => setBusy(null));
              }}
            />
            {syncConflict ? (
              <>
                <View style={styles.divider} />
                <View style={styles.verifyBox}>
                  <Text style={styles.menuTitle}>{t.syncConflictTitle}</Text>
                  <Text style={styles.menuSub}>
                    {syncConflict.server ? t.syncConflictBody : t.syncConflictNoCloud}
                  </Text>
                  {syncConflict.server ? (
                    <PrimaryButton
                      label={t.useCloudData}
                      onPress={() => void resolveSyncUseCloud()}
                    />
                  ) : null}
                  <PrimaryButton
                    label={t.keepLocalData}
                    variant={syncConflict.server ? 'ghost' : 'primary'}
                    onPress={() => void resolveSyncKeepLocal()}
                  />
                </View>
              </>
            ) : null}
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>{t.assetsSection}</Text>
      <View style={styles.group}>
        <MenuRow
          title={t.archivedAssets}
          subtitle={
            archivedCount
              ? t.archivedCount.replace('{n}', String(archivedCount))
              : t.archivedEmptyShort
          }
          onPress={() => navigation.navigate('ArchivedAssets')}
        />
      </View>

      <Text style={styles.sectionLabel}>{t.backupSection}</Text>
      <View style={styles.group}>
        <MenuRow
          title={t.exportBackup}
          subtitle={busy === 'export' ? '…' : undefined}
          onPress={() => {
            if (busy) return;
            void onExport();
          }}
        />
        <View style={styles.divider} />
        <MenuRow
          title={t.importBackup}
          subtitle={busy === 'import' ? '…' : undefined}
          onPress={() => {
            if (busy) return;
            void runImport();
          }}
        />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.sectionLabel}>{t.appearance}</Text>
      <View style={styles.langRow}>
        {([2, 3] as const).map((columns) => (
          <Pressable
            key={columns}
            onPress={() => setHomeColumns(columns)}
            style={[styles.langChip, state.homeColumns === columns && styles.langChipOn]}
          >
            <Text
              style={[styles.langChipText, state.homeColumns === columns && styles.langChipTextOn]}
            >
              {columns === 2 ? t.gridTwo : t.gridThree}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t.language}</Text>
      <View style={styles.langRow}>
        {(['en', 'id'] as const).map((lang) => (
          <Pressable
            key={lang}
            onPress={() => setLanguage(lang)}
            style={[styles.langChip, state.language === lang && styles.langChipOn]}
          >
            <Text style={[styles.langChipText, state.language === lang && styles.langChipTextOn]}>
              {lang.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t.securitySection}</Text>
      <View style={styles.group}>
        <MenuRow title={t.lockApp} subtitle={t.lockAppHint} onPress={() => void lock()} danger />
      </View>

      {devTaps >= 5 ? (
        <View style={styles.misc}>
          <PrimaryButton
            label={t.debug}
            variant="ghost"
            style={styles.debugButton}
            onPress={() => navigation.navigate('DebugMetrics')}
          />
        </View>
      ) : null}

      <View style={styles.footer}>
        <Pressable onPress={() => setDevTaps((n) => n + 1)} hitSlop={8}>
          <Text style={styles.version}>{t.appVersion.replace('{version}', '1.0.0')}</Text>
        </Pressable>
        <Copyright />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  profile: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '500', color: colors.text },
  profileText: { flex: 1 },
  email: { fontSize: 18, fontWeight: '500', color: colors.text },
  hint: { marginTop: 4, fontSize: 13, color: colors.muted, lineHeight: 18 },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.sm,
  },
  menuPressed: { backgroundColor: '#F0EBE3' },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, color: colors.text, fontWeight: '500' },
  menuSub: { marginTop: 3, fontSize: 13, color: colors.muted, lineHeight: 18 },
  menuDanger: { color: colors.danger },
  chevron: { fontSize: 22, color: colors.muted, lineHeight: 24 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: spacing.md },
  message: { marginTop: spacing.sm, fontSize: 13, color: colors.ok },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  langChipOn: { borderColor: colors.text, backgroundColor: colors.text },
  langChipText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  langChipTextOn: { color: colors.primaryText },
  misc: { marginTop: spacing.lg, alignItems: 'flex-start' },
  debugButton: { paddingHorizontal: 0, minHeight: 36 },
  footer: { marginTop: spacing.xl, gap: 8 },
  version: { fontSize: 12, color: colors.muted },
  verifyBox: { padding: spacing.md, gap: spacing.sm },
  cancelLink: { fontSize: 14, color: colors.muted, textDecorationLine: 'underline' },
  linkDisabled: { opacity: 0.45, textDecorationLine: 'none' },
});
