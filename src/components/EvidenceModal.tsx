import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../api/client';
import { BookingApi } from '../api/endpoints';
import { colors } from '../theme';
import type { Booking } from '../types';
import { Alert } from '../utils/dialog';
import type { PickedImage } from '../utils/upload';
import ImagePickerField from './ImagePickerField';
import { Button } from './ui';

export type EvidenceStatus = 'in_progress' | 'completed';

interface Props {
  job: Booking | null;
  status: EvidenceStatus | null;
  onClose: () => void;
  onDone: (updated: Booking) => void;
}

/** What the technician must upload for each step of the workflow. */
export function evidenceLabel(job: Booking, status: EvidenceStatus): string {
  if (status === 'in_progress') return 'Before images';
  return job.service.service_type === 'installation' ? 'Installation images' : 'After images';
}

export default function EvidenceModal({ job, status, onClose, onDone }: Props) {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setImages([]);
  }, [job?.id, status]);

  if (!job || !status) return null;
  const label = evidenceLabel(job, status);

  const submit = async () => {
    if (images.length === 0) {
      Alert.alert('Photos required', `Add at least one photo under "${label}".`);
      return;
    }
    
    setBusy(true);

    const form = new FormData();
    form.append('status', status);

    try {
      // 🟢 PROCESS THE IMAGES ASYNCHRONOUSLY
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const fileName = img.name || `evidence_${status}_${i}.jpg`;

        if (Platform.OS === 'web') {
          // 🛰️ WEB RESOLUTION ENGINE: Fetch the data stream directly from the browser context reference path
          const blobResponse = await fetch(img.uri);
          const blob = await blobResponse.blob();

          if (status === 'completed' && parseFloat(job.extra_service_charge || '0') > 0) {
            form.append('extra_after_images', blob, fileName);
          }
          form.append('images', blob, fileName);
        } else {
          // 📱 MOBILE EMULATOR / PHYSICAL PHONE FALLBACK TRACK PATH
          const mimeType = (img as any).type || (img as any).mimeType || 'image/jpeg';
          const fileData = {
            uri: img.uri.startsWith('file://') ? img.uri : `file://${img.uri}`,
            name: fileName,
            type: mimeType
          } as any;

          if (status === 'completed' && parseFloat(job.extra_service_charge || '0') > 0) {
            form.append('extra_after_images', fileData);
          }
          form.append('images', fileData);
        }
      }

      // Direct pass structured FormData object down through your endpoint service wrapper pipeline
      const updated = await BookingApi.updateStatus(job.id, form); 
      onDone(updated);
    } catch (err) {
      Alert.alert('Update failed', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{status === 'in_progress' ? 'Start job' : 'Complete job'} #{job.id}</Text>
            <Text style={styles.sub}>
              {job.service.name} · {job.date} · {job.time_slot_label}
            </Text>

            {/* Informs the technician when an out-of-scope fee requires extra photo logging verification proof */}
            {parseFloat(job.extra_service_charge || '0') > 0 && status === 'completed' && (
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>
                  ⚠️ Extra Service Added: "{job.extra_service_title}". Captured photos will be logged as both Task completion images and invoice billing proof.
                </Text>
              </View>
            )}

            <View style={{ marginTop: 14 }}>
              <ImagePickerField
                label={`${label} (required)`}
                images={images}
                onChange={setImages}
                hint={
                  status === 'in_progress'
                    ? 'Photograph the site before you begin work.'
                    : job.service.service_type === 'installation'
                    ? 'Photograph the finished installation.'
                    : 'Photograph the result after the repair.'
                }
              />
            </View>

            <Button
              title={status === 'in_progress' ? 'Upload & start job' : 'Upload & mark completed'}
              onPress={submit}
              loading={busy}
            />
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={busy} style={{ marginTop: 10 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginTop: 2 },
  alertBox: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 6, marginTop: 8 },
  alertText: { color: '#92400E', fontSize: 12, fontWeight: '600' }
});
