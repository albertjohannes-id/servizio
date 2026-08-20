import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function TappablePhoto({
  uri,
  style,
  accessibilityLabel,
}: {
  uri: string;
  style?: object;
  accessibilityLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel}
      >
        <Image source={{ uri }} style={[styles.thumb, style]} resizeMode="cover" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Image source={{ uri }} style={styles.full} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { width: '100%', height: 140, backgroundColor: colors.border, borderRadius: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,26,23,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  full: { width: '100%', height: '100%', maxHeight: '90%' },
});
