import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BookingApi } from '../api/endpoints';
import { colors } from '../theme';
import { KeyValue } from './ui';
import { Alert } from '../utils/dialog';

interface AddExtraModalProps {
  visible: boolean;
  bookingId: number;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AddExtraServiceModal({ visible, bookingId, onClose, onRefresh }: AddExtraModalProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [charge, setCharge] = useState('');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 📸 1. CAPTURE WITH DEVICE CAMERA
  const takeBeforePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera permissions are required to take real-time photos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!res.canceled && res.assets) {
      setImages((prev) => [...prev, ...res.assets]); // Append new capture
    }
  };

  // 📁 2. CHOOSE FROM SYSTEM GALLERY
  const selectBeforePhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.6,
    });
    if (!res.canceled && res.assets) {
      setImages((prev) => [...prev, ...res.assets]); // Append selected array
    }
  };

  const handleApplyExtra = async () => {
    if (!title.trim() || !desc.trim() || !charge.trim()) {
      Alert.alert('Validation Error', 'Please complete all out-of-scope fields.');
      return;
    }

    if (isNaN(Number(charge)) || parseFloat(charge) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid charge amount.');
      return;
    }

    // 🔴 STRICT FRONTEND GATING CHECK
    if (images.length === 0) {
      Alert.alert('Photo Required', 'Please snap or attach a Before Photo to submit extra work invoices.');
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.append('extra_title', title.trim());
    form.append('extra_description', desc.trim());
    form.append('extra_charge', charge.trim());

    images.forEach((img, i) => {
      const fileUri = img.uri.startsWith('file://') ? img.uri : `file://${img.uri}`;
      form.append('extra_before_images', {
        uri: fileUri,
        name: `extra_before_${Date.now()}_${i}.jpg`,
        type: 'image/jpeg',
      } as any);
    });

    try {
      await BookingApi.addExtraService(bookingId, form);
      Alert.alert('Success', 'Dynamic out-of-scope service fee successfully applied to order.');
      onRefresh();
      onClose();
      setTitle(''); setDesc(''); setCharge(''); setImages([]);
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message || 'Could not update balance revisions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Append Out-of-Scope Field Service</Text>
            
            <TextInput 
              placeholder="Extra Service Title (e.g., Router Configuration)" 
              style={styles.input} 
              value={title} 
              onChangeText={setTitle} 
              placeholderTextColor={colors.muted} 
            />
            <TextInput 
              placeholder="Work Description Details" 
              multiline 
              style={[styles.input, { height: 70 }]} 
              value={desc} 
              onChangeText={setDesc} 
              placeholderTextColor={colors.muted} 
            />
            <TextInput 
              placeholder="Additional Charge Fee (₹)" 
              keyboardType="numeric" 
              style={styles.input} 
              value={charge} 
              onChangeText={setCharge} 
              placeholderTextColor={colors.muted} 
            />
            
            {/* 📸 ACTION BUTTONS ROW FOR CAMERA AND GALLERY */}
            <View style={styles.mediaRow}>
              <TouchableOpacity style={styles.btnCamera} onPress={takeBeforePhoto}>
                <Text style={styles.btnText}>📸 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGallery} onPress={selectBeforePhotos}>
                <Text style={styles.btnText}>📁 Gallery</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.mediaCount}>{images.length} assets attached</Text>

            {parseFloat(charge) > 0 ? (
              <View style={styles.incentiveCard}>
                <KeyValue k="Calculated Incentive (15%)" v={`₹ ${(parseFloat(charge) * 0.15).toFixed(2)}`} />
              </View>
            ) : null}
            
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyExtra} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Inject to Customer Bill</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.text}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, width: '100%', maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: colors.text, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 6, marginBottom: 12, color: colors.text },
  mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  btnCamera: { flex: 0.48, backgroundColor: colors.primary, padding: 12, borderRadius: 6, alignItems: 'center' },
  btnGallery: { flex: 0.48, backgroundColor: '#64748B', padding: 12, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  mediaCount: { textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: 13, marginBottom: 10 },
  incentiveCard: { backgroundColor: '#EEF2F6', padding: 10, borderRadius: 6, marginBottom: 10 },
  applyBtn: { backgroundColor: colors.success || '#10B981', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 15 },
  cancelBtn: { backgroundColor: colors.warning || '#EF4444', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  text: { color: '#fff', fontWeight: '800' }
});
