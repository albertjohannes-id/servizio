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
            <View style={styles.copy}>
              <Text style={[styles.title, on && styles.titleOn]}>{t[item.title]}</Text>
              <Text style={styles.hint}>{t[item.hint]}</Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  cardOn: { borderColor: colors.text, backgroundColor: '#E8E6E0' },
  icon: { width: 32, height: 32, backgroundColor: 'transparent' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '600', color: colors.text },
  titleOn: { color: colors.text },
  hint: { marginTop: 2, fontSize: 11, color: colors.muted, lineHeight: 14 },
});
