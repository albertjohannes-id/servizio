import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AssetType } from '../domain/types';
import { TYPE_IMAGES } from '../data/typeImages';
import { Dictionary } from '../i18n/strings';
import { colors } from '../theme';

const TYPES: AssetType[] = ['car', 'motorcycle', 'bike', 'ac', 'water_heater', 'other'];

export function TypePicker({
  value,
  onChange,
  t,
}: {
  value: AssetType;
  onChange: (type: AssetType) => void;
  t: Dictionary;
}) {
  const rows = [TYPES.slice(0, 3), TYPES.slice(3, 6)];
  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item) => {
            const on = item === value;
            return (
              <Pressable
                key={item}
                onPress={() => onChange(item)}
                style={[styles.card, on && styles.cardOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t[item]}
              >
                <Image source={TYPE_IMAGES[item]} style={styles.image} resizeMode="contain" />
                <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
                  {t[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  cardOn: {
    borderColor: colors.text,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  image: { width: 56, height: 56 },
  label: { marginTop: 4, fontSize: 11, color: colors.muted, textAlign: 'center', fontWeight: '500' },
  labelOn: { color: colors.text, fontWeight: '700' },
});
