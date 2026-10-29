import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage, fieldErrors } from '../../../api/client';
import { AdminApi } from '../../../api/endpoints';
import { Button, Chip, FormField } from '../../../components/ui';
import { colors } from '../../../theme';
import type { Service, ServiceType } from '../../../types';
import { Alert } from '../../../utils/dialog';
import { validatePrice, validateRequired } from '../../../utils/validation';

interface Props {
  visible: boolean;
  /** null = create a new service, otherwise edit this one */
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ServiceFormModal({ visible, service, onClose, onSaved }: Props) {
  const editing = !!service;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<ServiceType>('installation');
  const [icon, setIcon] = useState('');
  const [active, setActive] = useState(true);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Load the service being edited (or blank values) whenever the modal opens.
  useEffect(() => {
    if (!visible) return;
    setName(service?.name ?? '');
    setDescription(service?.description ?? '');
    setPrice(service?.base_price ?? '');
    setType(service?.service_type ?? 'installation');
    setIcon(service?.icon ?? '');
    setActive(service?.is_active ?? true);
    setAttempted(false);
    setServerErrors({});
  }, [visible, service]);

  const errors = {
    name: validateRequired('Name', name, 3, 100),
    base_price: validatePrice(price),
  };
  const err = (k: keyof typeof errors) => (attempted ? errors[k] : '') || serverErrors[k] || '';

  const submit = async () => {
    setAttempted(true);
    setServerErrors({});
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        base_price: price.trim(),
        service_type: type,
        icon: icon.trim(),
        is_active: active,
      };
      if (service) await AdminApi.updateService(service.id, payload);
      else await AdminApi.createService(payload);
      onSaved();
      onClose();
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe.name || fe.base_price || fe.service_type) setServerErrors(fe);
      else Alert.alert('Could not save service', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{editing ? 'Edit service' : 'Add service'}</Text>

            <View style={{ marginTop: 14 }}>
              <FormField label="Name" value={name} onChangeText={setName} error={err('name')} autoCapitalize="words" />
              <FormField
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                autoCapitalize="sentences"
                style={{ minHeight: 70, textAlignVertical: 'top' }}
              />
              <FormField label="Price (₹)" value={price} onChangeText={setPrice} error={err('base_price')} keyboardType="decimal-pad" placeholder="e.g. 1499" />

              <Text style={styles.label}>Service type</Text>
              <View style={styles.row}>
                <Chip label="Installation" selected={type === 'installation'} onPress={() => setType('installation')} />
                <Chip label="Service complaint" selected={type === 'service_complaint'} onPress={() => setType('service_complaint')} />
              </View>
              <Text style={styles.hint}>
                {type === 'installation'
                  ? 'Customers may skip the description. Technician uploads installation photos to finish.'
                  : 'Customers must describe the problem. Technician uploads after-repair photos to finish.'}
              </Text>

              <FormField label="Icon (emoji, optional)" value={icon} onChangeText={setIcon} maxLength={4} placeholder="📹" />

              {editing && (
                <>
                  <Text style={styles.label}>Visibility</Text>
                  <View style={styles.row}>
                    <Chip label="Active" selected={active} onPress={() => setActive(true)} />
                    <Chip label="Hidden from customers" selected={!active} onPress={() => setActive(false)} />
                  </View>
                </>
              )}
            </View>

            <Button title={editing ? 'Save changes' : 'Add service'} onPress={submit} loading={busy} style={{ marginTop: 12 }} />
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
    maxHeight: '92%',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 14 },
});
