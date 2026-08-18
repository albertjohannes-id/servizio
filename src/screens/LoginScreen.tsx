import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { Copyright } from '../components/Copyright';
import { colors, spacing } from '../theme';

export function LoginScreen() {
  const { login } = useAuth();
  const { state, setLanguage } = useAssets();
  const t = dictionaries[state.language];
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onContinue = async () => {
    if (!valid) return;
    setBusy(true);
    await login(email);
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View>
          <View style={styles.top}>
            <Text style={styles.mark}>{t.appName}</Text>
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
          <Text style={styles.lead}>{t.loginLead}</Text>
        </View>
        <View style={styles.form}>
          <TextField
            label={t.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@email.com"
            onSubmitEditing={onContinue}
            {...(Platform.OS === 'web' ? ({ type: 'email' } as object) : {})}
          />
          <View style={styles.cta}>
            <PrimaryButton
              label={t.continue}
              onPress={onContinue}
              disabled={!valid}
              loading={busy}
            />
          </View>
          <Text style={styles.hint}>{t.loginHint}</Text>
          <Copyright />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  mark: { fontSize: 28, fontWeight: '500', color: colors.text, letterSpacing: -0.4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  langRow: { flexDirection: 'row', gap: 14 },
  lang: { fontSize: 13, color: colors.muted },
  langOn: { color: colors.text, textDecorationLine: 'underline' },
  lead: { marginTop: 10, fontSize: 17, color: colors.muted, lineHeight: 24, maxWidth: 280 },
  form: { gap: 4 },
  cta: { marginTop: spacing.md },
  hint: { marginTop: spacing.sm, fontSize: 12, color: colors.muted, lineHeight: 18 },
});
