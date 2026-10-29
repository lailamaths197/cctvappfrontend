import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { Alert } from '../utils/dialog';
import type { PickedImage } from '../utils/upload';
import { Button } from './ui';

interface Props {
  label: string;
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  /** maximum number of photos (backend allows 6 per request) */
  max?: number;
  hint?: string;
  error?: string;
}

/** Multi-photo picker with thumbnails and per-photo remove. Works on phones and in the browser. */
export default function ImagePickerField({ label, images, onChange, max = 6, hint, error }: Props) {
  const remaining = max - images.length;

  const add = (assets: ImagePicker.ImagePickerAsset[]) => {
    const picked: PickedImage[] = assets.slice(0, remaining).map((a) => ({
      uri: a.uri,
      name: a.fileName,
      mimeType: a.mimeType,
    }));
    onChange([...images, ...picked]);
  };

  const fromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access in Settings to attach pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!result.canceled) add(result.assets);
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) add(result.assets);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>
        {label} <Text style={styles.count}>({images.length}/{max})</Text>
      </Text>

      {images.length > 0 && (
        <View style={styles.grid}>
          {images.map((img, i) => (
            <View key={`${img.uri}-${i}`} style={styles.thumbWrap}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <Pressable style={styles.remove} onPress={() => onChange(images.filter((_, j) => j !== i))} hitSlop={6}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {remaining > 0 && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {Platform.OS !== 'web' && <Button title="📷 Camera" variant="outline" onPress={fromCamera} style={{ flex: 1 }} />}
          <Button title={Platform.OS === 'web' ? '🖼️ Choose photos' : '🖼️ Gallery'} variant="outline" onPress={fromGallery} style={{ flex: 1 }} />
        </View>
      )}

      {!!error ? <Text style={styles.error}>{error}</Text> : !!hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  count: { color: colors.muted, fontWeight: '400' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  thumbWrap: { marginRight: 8, marginBottom: 8 },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e2e8f0' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
