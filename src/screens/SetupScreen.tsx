import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { TextField } from '../components/TextField';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { Dictionary, dictionaries } from '../i18n/strings';
import { colors, spacing } from '../theme';

type Step = 'email' | 'pin' | 'confirm' | 'sample';

function pinError(code: string | null, t: Dictionary): string | null {
  if (!code) return null;
  if (code === 'pin_mismatch') return t.pinMismatch;
  if (code === 'invalid_email') return t.invalidEmail;
  return t.wrongPin;
}

export function SetupScreen() {
  const { setupEmail, setSetupEmail, completeSetup } = useAuth();
  const { state, setLanguage, loadSampleData, startEmpty } = useAssets();
  const t = dictionaries[state.language];
  const [step, setStep] = useState<Step>('email');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupEmail.trim());

  const finishSetup = useCallback(
    async (withSample: boolean) => {
      setBusy(true);
      const code = await completeSetup(pin, pin);
      if (code) {
        setBusy(false);
        setError(pinError(code, t));
        setStep('pin');
        setPin('');
        return;
      }
      if (withSample) loadSampleData();
      else startEmpty();
      setBusy(false);
    },
    [completeSetup, loadSampleData, pin, startEmpty, t]
  );

  const onPinEntered = useCallback(
    async (value: string) => {
      setError(null);
      if (step === 'pin') {
        setPin(value);
        setStep('confirm');
        return;
      }
      if (value !== pin) {
        setError(t.pinMismatch);
        setStep('pin');
        setPin('');
        return;
      }
      setPin(value);
      setStep('sample');
    },
    [pin, step, t.pinMismatch]
  );

  useEffect(() => {
    setError(null);
  }, [step]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View>
          <View style={styles.top}>
            <AppLogo size={64} />
            <View style={styles.langRow}>
              {(['en', 'id'] as const).map((lang) => (
                <Pressable key={lang} onPress={() => setLanguage(lang)} hitSlop={8}>
                  <Text style={[styles.lang, state.language === lang && styles.langOn]}>
                    {lang.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.mark}>
            {step === 'pin' ? t.createPin : step === 'confirm' ? t.confirmPin : t.appName}
          </Text>
          {step === 'email' ? (
            <Text style={styles.lead}>{t.setupLead}</Text>
          ) : step === 'sample' ? (
            <Text style={styles.lead}>{t.sampleLead}</Text>
          ) : null}
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <TextField
              label={t.email}
              value={setupEmail}
              onChangeText={setSetupEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@email.com"
              {...(Platform.OS === 'web' ? ({ type: 'email' } as object) : {})}
            />
            <View style={styles.cta}>
              <PrimaryButton
                label={t.createPin}
                onPress={() => validEmail && setStep('pin')}
                disabled={!validEmail}
              />
            </View>
            <Text style={styles.hint}>{t.setupHint}</Text>
            <Copyright />
          </View>
        ) : step === 'sample' ? (
          <View style={styles.sampleBlock}>
            <Text style={styles.sampleBody}>{t.sampleBody}</Text>
            <PrimaryButton
              label={t.startEmpty}
              onPress={() => void finishSetup(false)}
              loading={busy}
              disabled={busy}
            />
            <PrimaryButton
              label={t.startWithSample}
              variant="ghost"
              onPress={() => void finishSetup(true)}
              disabled={busy}
            />
            <Pressable
              onPress={() => {
                setStep('confirm');
                setError(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.back}>{t.back}</Text>
            </Pressable>
            <Copyright />
          </View>
        ) : (
          <View style={styles.pinBlock}>
            <PinPad
              title={step === 'pin' ? t.createPin : t.confirmPin}
              subtitle={step === 'pin' ? t.createPinHint : t.confirmPinHint}
              error={error}
              disabled={busy}
              onChange={() => setError(null)}
              onComplete={onPinEntered}
            />
            <Pressable
              onPress={() => {
                setStep(step === 'confirm' ? 'pin' : 'email');
                setPin('');
                setError(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.back}>{t.back}</Text>
            </Pressable>
            <Copyright />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mark: { marginTop: spacing.md, fontSize: 28, fontWeight: '500', color: colors.text, letterSpacing: -0.4 },
  langRow: { flexDirection: 'row', gap: 14, paddingTop: 8 },
  lang: { fontSize: 13, color: colors.muted },
  langOn: { color: colors.text, textDecorationLine: 'underline' },
  lead: { marginTop: 10, fontSize: 17, color: colors.muted, lineHeight: 24, maxWidth: 320 },
  form: { gap: 4 },
  pinBlock: { alignItems: 'center', gap: spacing.md },
  sampleBlock: { gap: spacing.md },
  sampleBody: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  cta: { marginTop: spacing.md },
  hint: { marginTop: spacing.sm, fontSize: 12, color: colors.muted, lineHeight: 18 },
  back: { fontSize: 14, color: colors.muted, textDecorationLine: 'underline', textAlign: 'center' },
});
