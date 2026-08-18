import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../data/AuthContext';
import { useAssets } from '../data/AssetContext';
import { dictionaries } from '../i18n/strings';
import { PrimaryButton } from '../components/PrimaryButton';
import { Copyright } from '../components/Copyright';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { email, logout } = useAuth();
  const { state } = useAssets();
  const t = dictionaries[state.language];

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>{t.email}</Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.hint}>{t.loginHint}</Text>
      <View style={styles.actions}>
        <PrimaryButton
          label={t.debug}
          variant="ghost"
          onPress={() => navigation.navigate('DebugMetrics')}
        />
        <PrimaryButton
          label={t.logout}
          variant="danger"
          onPress={() => {
            void logout();
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
  actions: { marginTop: spacing.xl, gap: spacing.md, alignItems: 'flex-start' },
  footer: { marginTop: 'auto' as const, paddingBottom: spacing.md },
});
