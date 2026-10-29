import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '../api/client';
import { Button, FormField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRegisterForm } from '../hooks/useRegisterForm';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { Alert } from '../utils/dialog';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const form = useRegisterForm();
  const [busy, setBusy] = React.useState(false);

  const onSubmit = async () => {
    const payload = form.prepareSubmit();
    if (!payload) return; // errors are now visible under each field
    setBusy(true);
    try {
      await register(payload); // creates the account, then signs in -> navigator switches to the dashboard
    } catch (err) {
      // Field-level server errors (e.g. email already used) show under the field;
      // anything else becomes an alert.
      if (!form.applyServerErrors(err)) Alert.alert('Registration failed', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const rules: { ok: boolean; text: string }[] = [
    { ok: form.checks.length, text: 'At least 8 characters' },
    { ok: form.checks.upper && form.checks.lower, text: 'Upper & lower case letters' },
    { ok: form.checks.digit, text: 'A number' },
    { ok: form.checks.special, text: 'A special character (! @ # $ …)' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Book CCTV installation and repair in minutes.</Text>

          <View style={{ marginTop: 20 }}>
            <FormField
              label="Full name"
              value={form.values.fullName}
              onChangeText={(t) => form.setValue('fullName', t)}
              onBlur={() => form.onBlur('fullName')}
              error={form.errorFor('fullName')}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="e.g. Asha Rao"
            />
            <FormField
              label="Email"
              value={form.values.email}
              onChangeText={(t) => form.setValue('email', t)}
              onBlur={() => form.onBlur('email')}
              error={form.errorFor('email')}
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <FormField
              label="Phone number"
              value={form.values.phone}
              onChangeText={(t) => form.setValue('phone', t)}
              onBlur={() => form.onBlur('phone')}
              error={form.errorFor('phone')}
              keyboardType="phone-pad"
              maxLength={14}
              autoComplete="tel"
              placeholder="10-digit mobile number"
            />
            <FormField
              label="Password"
              value={form.values.password}
              onChangeText={(t) => form.setValue('password', t)}
              onBlur={() => form.onBlur('password')}
              error={form.errorFor('password')}
              secureToggle
              autoComplete="new-password"
              placeholder="Create a strong password"
            />

            {form.values.password.length > 0 && (
              <View style={styles.rules}>
                {rules.map((r) => (
                  <Text key={r.text} style={{ color: r.ok ? colors.success : colors.muted, fontSize: 12, marginBottom: 2 }}>
                    {r.ok ? '✓' : '○'} {r.text}
                  </Text>
                ))}
              </View>
            )}

            <FormField
              label="Confirm password"
              value={form.values.confirmPassword}
              onChangeText={(t) => form.setValue('confirmPassword', t)}
              onBlur={() => form.onBlur('confirmPassword')}
              error={form.errorFor('confirmPassword')}
              secureToggle
              autoComplete="new-password"
              placeholder="Re-enter your password"
              onSubmitEditing={onSubmit}
            />

            <Button title="Create account" onPress={onSubmit} loading={busy} disabled={!form.isValid} />

            <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primary },
  subtitle: { color: colors.muted, marginTop: 4 },
  rules: { marginTop: -6, marginBottom: 14, paddingLeft: 4 },
});
