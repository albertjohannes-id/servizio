import React, { useMemo, useState } from 'react';
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
import { dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { Copyright } from '../components/Copyright';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

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
  const { email, lock } = useAuth();
  const { state, importState, setLanguage } = useAssets();
  const t = dictionaries[state.language];
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const archivedCount = useMemo(
    () => state.assets.filter((a) => a.archived).length,
    [state.assets]
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{(email?.[0] ?? 'S').toUpperCase()}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.hint}>{t.accountHint}</Text>
        </View>
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

      <View style={styles.misc}>
        <PrimaryButton
          label={t.debug}
          variant="ghost"
          onPress={() => navigation.navigate('DebugMetrics')}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>{t.appVersion.replace('{version}', '1.0.0')}</Text>
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
  footer: { marginTop: spacing.xl, gap: 8 },
  version: { fontSize: 12, color: colors.muted },
});
