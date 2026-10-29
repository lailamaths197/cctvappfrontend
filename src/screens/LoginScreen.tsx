import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '../api/client';
import { Button, FormField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { Alert } from '../utils/dialog';
import { validateEmail } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const emailError = validateEmail(email);
  const passwordError = password ? '' : 'Password is required.';

  const submit = async () => {
    setAttempted(true);
    if (emailError || passwordError) return;
    setBusy(true);
    try {
      await login(email, password); // navigation switches automatically once `user` is set
    } catch (err: any) {
      const wrongCreds = err?.response?.status === 401;
      Alert.alert('Login failed', wrongCreds ? 'Incorrect email or password.' : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>📹</Text>
          <Text style={styles.title}>SecureView CCTV</Text>
          <Text style={styles.subtitle}>Installation & service booking</Text>

          <View style={{ marginTop: 28 }}>
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              error={attempted ? emailError : ''}
              placeholder="you@example.com"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureToggle
              error={attempted ? passwordError : ''}
              placeholder="Your password"
              onSubmitEditing={submit}
            />
            <Button title="Log in" onPress={submit} loading={busy} />
            <Button
              title="Create a new account"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              style={{ marginTop: 12 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 48 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.primary, marginTop: 8 },
  subtitle: { textAlign: 'center', color: colors.muted, marginTop: 4 },
});
