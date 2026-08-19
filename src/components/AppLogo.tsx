import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const logo = require('../../assets/icon.png');

type Props = {
  size?: number;
};

export function AppLogo({ size = 72 }: Props) {
  return (
    <View style={[styles.frame, { width: size + 8, height: size + 8, borderRadius: (size + 8) * 0.22 }]}>
      <Image source={logo} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
