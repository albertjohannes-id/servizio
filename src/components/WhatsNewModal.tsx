import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHANGELOG } from '../data/changelog';
import { formatDate } from '../domain/status';
import { dictionaries } from '../i18n/strings';
import { APP_VERSION } from '../version';
import { colors } from '../theme';
import { PrimaryButton } from './PrimaryButton';

export function WhatsNewModal({
  visible,
  onClose,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  language: 'en' | 'id';
}) {
  const t = dictionaries[language];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.inner}>
            <Text style={styles.kicker}>{t.whatsNew}</Text>
            <Text style={styles.title}>{t.appVersion.replace('{version}', APP_VERSION)}</Text>

            {CHANGELOG.map((entry, index) => (
              <View key={entry.version} style={styles.entry}>
                <Text style={styles.entryHead}>
                  v{entry.version}
                  <Text style={styles.entryDate}> · {formatDate(entry.date)}</Text>
                </Text>
                {(language === 'id' ? entry.id : entry.en).map((line) => (
                  <View key={line} style={styles.row}>
                    <Text style={[styles.bullet, index > 0 && styles.older]}>•</Text>
                    <Text style={[styles.line, index > 0 && styles.older]}>{line}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton label={t.done} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,26,23,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  scroll: { flexShrink: 1 },
  inner: { padding: 18, paddingBottom: 8, gap: 14 },
  footer: {
    padding: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  kicker: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '600', color: colors.text, letterSpacing: -0.3 },
  entry: { gap: 6 },
  entryHead: { fontSize: 15, fontWeight: '600', color: colors.text },
  entryDate: { fontWeight: '400', color: colors.muted },
  row: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 15, lineHeight: 22, color: colors.text },
  line: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
  older: { color: colors.muted },
});
