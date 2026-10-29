import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import type { BookingImage, ImageKind } from '../types';

const LABEL: Record<ImageKind, string> = {
  complaint: 'Customer photos',
  before: 'Before work',
  installation: 'Installation',
  after: 'After work',
};

const ORDER: ImageKind[] = ['complaint', 'before', 'installation', 'after'];

/** Photos grouped by purpose, as small thumbnails; tap one to view it full size. */
export default function BookingImages({ images }: { images: BookingImage[] }) {
  const [open, setOpen] = useState<string | null>(null);

  const groups = ORDER.map((kind) => ({ kind, list: images.filter((i) => i.kind === kind) })).filter((g) => g.list.length > 0);
  if (groups.length === 0) return null;

  return (
    <View style={{ marginTop: 10 }}>
      {groups.map((g) => (
        <View key={g.kind} style={{ marginBottom: 8 }}>
          <Text style={styles.label}>
            {LABEL[g.kind]} ({g.list.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {g.list.map((img) => (
              <Pressable key={img.id} onPress={() => setOpen(img.image)}>
                <Image source={{ uri: img.image }} style={styles.thumb} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(null)}>
          {open ? <Image source={{ uri: open }} style={styles.full} resizeMode="contain" /> : null}
          <Text style={styles.hint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  thumb: { width: 84, height: 84, borderRadius: 10, marginRight: 8, backgroundColor: '#e2e8f0' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  full: { width: '100%', height: '85%' },
  hint: { color: '#cbd5e1', marginTop: 10, fontSize: 12 },
});
