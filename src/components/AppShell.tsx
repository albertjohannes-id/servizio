import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function AppShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return (
    <View style={styles.page}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#E6E1D6',
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
});
