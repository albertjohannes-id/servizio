import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AssetLocation } from '../domain/types';
import { Dictionary } from '../i18n/strings';
import { colors } from '../theme';

const OPTIONS: {
  id: AssetLocation;
  title: keyof Dictionary;
  hint: keyof Dictionary;
  image: number;
}[] = [
  {
    id: 'home',
    title: 'locationHome',
    hint: 'locationHomeHint',
    image: require('../../assets/location/home.png'),
  },
  {
    id: 'service_center',
    title: 'locationServiceCenter',
    hint: 'locationServiceCenterHint',
    image: require('../../assets/location/workshop.png'),
  },
];

export function LocationPicker({
  value,
  onChange,
  t,
}: {
  value: AssetLocation;
  onChange: (next: AssetLocation) => void;
  t: Dictionary;
}) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((item) => {
        const on = item.id === value;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[styles.card, on && styles.cardOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t[item.title]}
          >
            <Image source={item.image} style={styles.icon} resizeMode="contain" />
            <Text style={[styles.title, on && styles.titleOn]}>{t[item.title]}</Text>
            <Text style={styles.hint}>{t[item.hint]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, marginTop: 4 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardOn: { borderColor: colors.text, backgroundColor: '#E8E6E0' },
  icon: { width: 40, height: 40, marginBottom: 6 },
  title: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  titleOn: { color: colors.text },
  hint: { marginTop: 4, fontSize: 11, color: colors.muted, lineHeight: 15, textAlign: 'center' },
});
