import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage, fieldErrors } from '../../../api/client';
import { AdminApi } from '../../../api/endpoints';
import { Button, FormField } from '../../../components/ui';
import { colors } from '../../../theme';
import type { CreatedTechnician } from '../../../types';
import { Alert } from '../../../utils/dialog';
import { normalizePhone, validateEmail, validateFullName, validatePassword, validatePhone } from '../../../utils/validation';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Admin creates a technician account; the login credentials are shown once on success. */
export default function CreateTechnicianModal({ visible, onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<CreatedTechnician | null>(null);

  const errors = {
    full_name: validateFullName(fullName),
    email: validateEmail(email),
    phone_number: validatePhone(phone),
    // optional: blank = the server generates a strong temporary password
    password: password ? validatePassword(password) : '',
  };
  const err = (k: keyof typeof errors) => (attempted ? errors[k] : '') || serverErrors[k] || '';

  const reset = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setAttempted(false);
    setServerErrors({});
    setCreated(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setAttempted(true);
    setServerErrors({});
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    try {
      const result = await AdminApi.createTechnician({
        full_name: fullName.trim().replace(/\s+/g, ' '),
        email: email.trim().toLowerCase(),
        phone_number: normalizePhone(phone),
        password: password || undefined,
      });
      setCreated(result);
      onCreated();
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe.email || fe.phone_number || fe.password || fe.full_name) setServerErrors(fe);
      else Alert.alert('Could not create technician', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {created ? (
              <>
                <Text style={styles.title}>Technician created ✅</Text>
                <Text style={styles.sub}>Share these login details with {created.full_name}.</Text>
                <View style={styles.credBox}>
                  <Text style={styles.credLabel}>Email (login)</Text>
                  <Text selectable style={styles.credValue}>{created.email}</Text>
                  <Text style={[styles.credLabel, { marginTop: 10 }]}>Password</Text>
                  {created.temporary_password ? (
                    <>
                      <Text selectable style={styles.credValue}>{created.temporary_password}</Text>
                      <Text style={styles.warn}>This temporary password is shown only once. Copy it now.</Text>
                    </>
                  ) : (
                    <Text style={styles.credValue}>the password you entered</Text>
                  )}
                </View>
                <Button title="Done" onPress={close} style={{ marginTop: 16 }} />
              </>
            ) : (
              <>
                <Text style={styles.title}>Add technician</Text>
                <Text style={styles.sub}>Technicians cannot sign up themselves; you create their login here.</Text>
                <View style={{ marginTop: 14 }}>
                  <FormField label="Full name" value={fullName} onChangeText={setFullName} error={err('full_name')} autoCapitalize="words" />
                  <FormField label="Email (used to log in)" value={email} onChangeText={setEmail} error={err('email')} keyboardType="email-address" />
                  <FormField label="Phone number" value={phone} onChangeText={setPhone} error={err('phone_number')} keyboardType="phone-pad" maxLength={14} />
                  <FormField
                    label="Password (optional)"
                    value={password}
                    onChangeText={setPassword}
                    error={err('password')}
                    hint="Leave blank to generate a strong temporary password."
                    secureToggle
                  />
                </View>
                <Button title="Create technician" onPress={submit} loading={busy} />
                <Button title="Cancel" variant="outline" onPress={close} disabled={busy} style={{ marginTop: 10 }} />
              </>
            )}
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
  sub: { color: colors.muted, marginTop: 2 },
  credBox: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, marginTop: 14 },
  credLabel: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  credValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  warn: { color: colors.warning, fontSize: 12, marginTop: 6, fontWeight: '600' },
});
