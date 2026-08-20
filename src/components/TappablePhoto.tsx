import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveDisplayUri } from '../data/photoSync';
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
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void resolveDisplayUri(uri).then((next) => {
      if (cancelled) return;
      setDisplayUri(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (loading) {
    return (
      <View style={[styles.thumb, styles.loading, style]}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  if (!displayUri) {
    return <View style={[styles.thumb, style]} />;
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel}
      >
        <Image source={{ uri: displayUri }} style={[styles.thumb, style]} resizeMode="cover" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Image source={{ uri: displayUri }} style={styles.full} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { width: '100%', height: 140, backgroundColor: colors.border, borderRadius: 8 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,26,23,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  full: { width: '100%', height: '100%', maxHeight: '90%' },
});
