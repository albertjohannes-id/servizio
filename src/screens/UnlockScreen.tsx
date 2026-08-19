import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '../components/AppLogo';
import { Copyright } from '../components/Copyright';
import { PinPad } from '../components/PinPad';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { MAX_PIN_ATTEMPTS } from '../data/pinAuth';
import { Dictionary, dictionaries } from '../i18n/strings';
import { colors, spacing } from '../theme';

function attemptsLeft(failed: number, t: Dictionary): string | null {
  const left = MAX_PIN_ATTEMPTS - failed;
  if (left <= 0) return null;
  if (failed >= 7) return t.attemptsLeftFew.replace('{n}', String(left));
  if (failed >= 3) return t.attemptsLeft.replace('{n}', String(left));
  return null;
}

export function UnlockScreen() {
  const {
    email,
    failedAttempts,
    canResetAfterLockout,
    tryUnlock,
    verifyCurrentPin,
    resetDevice,
  } = useAuth();
  const { state } = useAssets();
  const t = dictionaries[state.language];
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseStep, setEraseStep] = useState<'confirm' | 'pin'>('confirm');
  const [eraseError, setEraseError] = useState<string | null>(null);

  const onUnlock = useCallback(
    async (pin: string) => {
      setBusy(true);
      const code = await tryUnlock(pin);
      setBusy(false);
      if (code === 'wrong_pin') {
        setError(t.wrongPin);
        return;
      }
      if (code === 'locked_out') {
        setError(t.tooManyAttempts);
        return;
      }
      setError(null);
    },
    [t.tooManyAttempts, t.wrongPin, tryUnlock]
  );

  const openErase = () => {
    setEraseStep('confirm');
    setEraseError(null);
    setEraseOpen(true);
  };

  const confirmErasePin = async (pin: string) => {
    setBusy(true);
    const ok = await verifyCurrentPin(pin);
    setBusy(false);
    if (!ok) {
      setEraseError(t.wrongPin);
      return;
    }
    setEraseOpen(false);
    await resetDevice('manual');
  };

  const confirmLockoutReset = () => {
    const run = () => void resetDevice('lockout');
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t.resetConfirmBody)) run();
      return;
    }
    Alert.alert(t.resetConfirmTitle, t.resetConfirmBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.eraseAllData, style: 'destructive', onPress: run },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <AppLogo size={64} />
          <Text style={styles.mark}>{t.appName}</Text>
          <Text style={styles.welcome}>{t.welcomeBack}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <PinPad
          title={t.enterPin}
          subtitle={t.enterPinHint}
          error={error || attemptsLeft(failedAttempts, t)}
          disabled={busy || canResetAfterLockout}
          onChange={() => setError(null)}
          onComplete={onUnlock}
        />

        <View style={styles.footer}>
          {canResetAfterLockout ? (
            <View style={styles.lockoutBox}>
              <Text style={styles.lockoutText}>{t.tooManyAttempts}</Text>
              <PrimaryButton label={t.resetThisDevice} variant="danger" onPress={confirmLockoutReset} />
            </View>
          ) : (
            <Pressable onPress={openErase} hitSlop={8}>
              <Text style={styles.eraseLink}>{t.eraseAllData}</Text>
            </Pressable>
          )}
          <Copyright />
        </View>
      </View>

      <Modal visible={eraseOpen} transparent animationType="fade" onRequestClose={() => setEraseOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {eraseStep === 'confirm' ? (
              <>
                <Text style={styles.modalTitle}>{t.eraseConfirmTitle}</Text>
                <Text style={styles.modalBody}>{t.eraseConfirmBody}</Text>
                <View style={styles.modalActions}>
                  <PrimaryButton label={t.cancel} variant="ghost" onPress={() => setEraseOpen(false)} />
                  <PrimaryButton
                    label={t.continue}
                    variant="danger"
                    onPress={() => setEraseStep('pin')}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{t.enterPinToErase}</Text>
                <PinPad
                  error={eraseError}
                  disabled={busy}
                  onChange={() => setEraseError(null)}
                  onComplete={confirmErasePin}
                />
                <Pressable onPress={() => setEraseStep('confirm')} hitSlop={8}>
                  <Text style={styles.back}>{t.back}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center' },
  mark: { marginTop: spacing.md, fontSize: 24, fontWeight: '500', color: colors.text },
  welcome: { marginTop: spacing.lg, fontSize: 14, color: colors.muted },
  email: { marginTop: 4, fontSize: 16, color: colors.text },
  footer: { alignItems: 'center', gap: spacing.md },
  eraseLink: { fontSize: 13, color: colors.danger, textDecorationLine: 'underline' },
  lockoutBox: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  lockoutText: { fontSize: 13, color: colors.danger, textAlign: 'center', lineHeight: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 26, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '500', color: colors.text },
  modalBody: { marginTop: spacing.sm, fontSize: 14, color: colors.muted, lineHeight: 20 },
  modalActions: { marginTop: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
  back: { marginTop: spacing.md, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
