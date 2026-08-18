import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function Copyright() {
  return <Text style={styles.text}>Inovateks</Text>;
}

const styles = StyleSheet.create({
  text: {
    marginTop: 16,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.muted,
    opacity: 0.55,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
