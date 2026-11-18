import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const BLUE = '#0095F6';

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Verified"
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.check, { fontSize: size * 0.62, lineHeight: size }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontWeight: '800',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
