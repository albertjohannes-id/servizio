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

type Step = 'email' | 'otp' | 'pin' | 'confirm' | 'sample' | 'restore';

const OTP_RESEND_COOLDOWN_SEC = 45;

function pinError(code: string | null, t: Dictionary): string | null {
  if (!code) return null;
  if (code === 'pin_mismatch') return t.pinMismatch;
  if (code === 'invalid_email') return t.invalidEmail;
  return t.wrongPin;
}

function otpError(code: string | null, t: Dictionary): string | null {
  if (!code) return null;
  if (code === 'otp_invalid') return t.otpInvalid;
  if (code === 'otp_expired') return t.otpExpired;
  if (code === 'rate_limited' || code === 'otp_locked') return t.otpRateLimited;
  if (code === 'network_error') return t.networkError;
  return t.otpFailed;
}

export function SetupScreen() {
  const {
    setupEmail,
    setSetupEmail,
    completeSetup,
    checkSetupEmail,
    requestSetupOtp,
    verifySetupOtp,
    registerCloudAccount,
    pendingCloudBlob,
    clearPendingCloudBlob,
  } = useAuth();
  const { state, setLanguage, loadSampleData, startEmpty, applyRemoteState, syncNow } = useAssets();
  const t = dictionaries[state.language];
  const [step, setStep] = useState<Step>('email');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [isExisting, setIsExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupEmail.trim());
  const validOtp = /^\d{6}$/.test(otp.trim());

  const startResendCooldown = useCallback(() => {
    setResendIn(OTP_RESEND_COOLDOWN_SEC);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const finishLocal = useCallback(
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
      if (!isExisting) {
        const reg = await registerCloudAccount();
        if (!reg.ok && reg.error !== 'network_error' && reg.error !== 'email_exists') {
          // Local setup still succeeded; cloud can be linked later from Account.
        }
      }
      if (withSample) loadSampleData();
      else startEmpty();
      void syncNow();
      setBusy(false);
    },
    [completeSetup, isExisting, loadSampleData, pin, registerCloudAccount, startEmpty, syncNow, t]
  );

  const finishRestore = useCallback(async () => {
    if (!pendingCloudBlob) return;
    setBusy(true);
    await applyRemoteState(pendingCloudBlob);
    clearPendingCloudBlob();
    const code = await completeSetup(pin, pin);
    if (code) {
      setBusy(false);
      setError(pinError(code, t));
      setStep('pin');
      setPin('');
      return;
    }
    void syncNow();
    setBusy(false);
  }, [applyRemoteState, clearPendingCloudBlob, completeSetup, pendingCloudBlob, pin, syncNow, t]);

  const onContinueEmail = useCallback(async () => {
    if (!validEmail) return;
    setBusy(true);
    setError(null);
    const result = await checkSetupEmail();
    if (result.type === 'offline') {
      setBusy(false);
      setIsExisting(false);
      setStep('pin');
      return;
    }
    if (result.type === 'existing') {
      setIsExisting(true);
      const otpRes = await requestSetupOtp();
      setBusy(false);
      if (!otpRes.ok) {
        setError(otpError(otpRes.error, t));
        return;
      }
      setDevOtp(otpRes.devOtp);
      startResendCooldown();
      setStep('otp');
      return;
    }
    setIsExisting(false);
    setBusy(false);
    setStep('pin');
  }, [checkSetupEmail, requestSetupOtp, startResendCooldown, t, validEmail]);

  const onResendOtp = useCallback(async () => {
    if (busy || resendIn > 0) return;
    setBusy(true);
    setError(null);
    const otpRes = await requestSetupOtp();
    setBusy(false);
    if (!otpRes.ok) {
      setError(otpError(otpRes.error, t));
      return;
    }
    setDevOtp(otpRes.devOtp);
    setOtp('');
    startResendCooldown();
  }, [busy, requestSetupOtp, resendIn, startResendCooldown, t]);

  const onVerifyOtp = useCallback(async () => {
    if (!validOtp) return;
    setBusy(true);
    setError(null);
    const result = await verifySetupOtp(otp.trim());
    setBusy(false);
    if (!result.ok) {
      setError(otpError(result.error, t));
      return;
    }
    setStep('pin');
  }, [otp, t, validOtp, verifySetupOtp]);

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
      if (pendingCloudBlob) setStep('restore');
      else setStep('sample');
    },
    [pendingCloudBlob, pin, step, t.pinMismatch]
  );

  useEffect(() => {
    setError(null);
  }, [step]);

  const markTitle =
    step === 'otp'
      ? t.enterOtp
      : step === 'pin'
        ? t.createPin
        : step === 'confirm'
          ? t.confirmPin
          : step === 'restore'
            ? t.restoreCloudTitle
            : t.appName;

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
          <Text style={styles.mark}>{markTitle}</Text>
          {step === 'email' ? <Text style={styles.lead}>{t.setupLead}</Text> : null}
          {step === 'otp' ? <Text style={styles.lead}>{t.otpLead}</Text> : null}
          {step === 'sample' ? <Text style={styles.lead}>{t.sampleLead}</Text> : null}
          {step === 'restore' ? <Text style={styles.lead}>{t.restoreCloudLead}</Text> : null}
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <TextField
              label={t.email}
              required
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
                label={t.continue}
                onPress={() => void onContinueEmail()}
                disabled={!validEmail || busy}
                loading={busy}
              />
            </View>
            <Text style={styles.hint}>{t.setupHint}</Text>
            <Text style={styles.hint}>{t.setupOfflineHint}</Text>
            <Copyright />
          </View>
        ) : step === 'otp' ? (
          <View style={styles.form}>
            <TextField
              label={t.otpCode}
              required
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="123456"
              {...(Platform.OS === 'web' ? ({ inputMode: 'numeric' } as object) : {})}
            />
            <Text style={styles.hint}>{t.otpExpiresHint}</Text>
            {devOtp ? <Text style={styles.devOtp}>{t.devOtpHint.replace('{code}', devOtp)}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.cta}>
              <PrimaryButton
                label={t.verifyOtp}
                onPress={() => void onVerifyOtp()}
                disabled={!validOtp || busy}
                loading={busy}
              />
            </View>
            <Pressable
              onPress={() => void onResendOtp()}
              disabled={busy || resendIn > 0}
              hitSlop={8}
            >
              <Text style={[styles.back, (busy || resendIn > 0) && styles.backDisabled]}>
                {resendIn > 0 ? t.resendOtpIn.replace('{n}', String(resendIn)) : t.resendOtp}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setStep('email');
                setOtp('');
                setDevOtp(undefined);
                setResendIn(0);
              }}
              hitSlop={8}
            >
              <Text style={styles.back}>{t.back}</Text>
            </Pressable>
            <Copyright />
          </View>
        ) : step === 'sample' ? (
          <View style={styles.sampleBlock}>
            <Text style={styles.sampleBody}>{t.sampleBody}</Text>
            <PrimaryButton
              label={t.startEmpty}
              onPress={() => void finishLocal(false)}
              loading={busy}
              disabled={busy}
            />
            <PrimaryButton
              label={t.startWithSample}
              variant="ghost"
              onPress={() => void finishLocal(true)}
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
        ) : step === 'restore' ? (
          <View style={styles.sampleBlock}>
            <Text style={styles.sampleBody}>{t.restoreCloudBody}</Text>
            <PrimaryButton
              label={t.useCloudData}
              onPress={() => void finishRestore()}
              loading={busy}
              disabled={busy}
            />
            <PrimaryButton
              label={t.startEmptyInstead}
              variant="ghost"
              onPress={() => {
                clearPendingCloudBlob();
                setStep('sample');
              }}
              disabled={busy}
            />
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
                setStep(step === 'confirm' ? 'pin' : isExisting ? 'otp' : 'email');
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
  backDisabled: { opacity: 0.45, textDecorationLine: 'none' },
  error: { marginTop: 8, fontSize: 14, color: colors.danger },
  devOtp: { marginTop: 8, fontSize: 13, color: colors.muted },
});
