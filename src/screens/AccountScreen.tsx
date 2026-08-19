import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
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

export function AccountScreen({ navigation }: Props) {
  const { email, lock } = useAuth();
  const { state, importState } = useAssets();
  const t = dictionaries[state.language];
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
          resolve(typeof window !== 'undefined' ? window.confirm(`${t.importConfirmTitle}\n\n${body}`) : false);
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
    <View style={styles.screen}>
      <Text style={styles.label}>{t.email}</Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.hint}>{t.accountHint}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.backupSection}</Text>
        <Text style={styles.sectionHint}>{t.backupHint}</Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={t.exportBackup}
            onPress={() => void onExport()}
            loading={busy === 'export'}
            disabled={busy != null}
          />
          <PrimaryButton
            label={t.importBackup}
            variant="ghost"
            onPress={() => void runImport()}
            loading={busy === 'import'}
            disabled={busy != null}
          />
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={t.debug}
          variant="ghost"
          onPress={() => navigation.navigate('DebugMetrics')}
        />
        <PrimaryButton
          label={t.lockApp}
          variant="danger"
          onPress={() => {
            void lock();
          }}
        />
      </View>
      <View style={styles.footer}>
        <Copyright />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  email: { marginTop: 8, fontSize: 20, color: colors.text },
  hint: { marginTop: spacing.md, fontSize: 13, color: colors.muted, lineHeight: 20 },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  sectionHint: { marginTop: 6, fontSize: 13, color: colors.muted, lineHeight: 20 },
  actions: { marginTop: spacing.md, gap: spacing.md, alignItems: 'flex-start' },
  message: { marginTop: spacing.sm, fontSize: 13, color: colors.ok },
  footer: { marginTop: 'auto' as const, paddingBottom: spacing.md },
});
