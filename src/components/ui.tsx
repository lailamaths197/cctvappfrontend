import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, statusColors } from '../theme';
import NotificationBell from './NotificationBell';

/* ---------- FormField ---------- */

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** adds a Show/Hide toggle (for passwords) */
  secureToggle?: boolean;
  hint?: string;
}

export function FormField({ label, error, secureToggle, hint, style, ...inputProps }: FormFieldProps) {
  const [hidden, setHidden] = useState(true);
  const secure = secureToggle ? hidden : inputProps.secureTextEntry;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, !!error && styles.inputError]}>
        <TextInput
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          {...inputProps}
          secureTextEntry={secure}
          style={[styles.input, style]}
        />
        {secureToggle && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {!!error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ---------- Buttons ---------- */

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle;
}

export function Button({ title, onPress, disabled, loading, variant = 'primary', style }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        variant === 'outline' && styles.btnOutline,
        variant === 'danger' && styles.btnDanger,
        off && styles.btnDisabled,
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.btnText, variant === 'outline' && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

/* ---------- Badge, Chip, Card ---------- */

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const c = statusColors[value] ?? { bg: '#e2e8f0', fg: colors.text };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label ?? value.replace('_', ' ')}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segItem, value === o.key && styles.segActive]}>
          <Text style={[styles.segText, value === o.key && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ScreenHeader({ title, subtitle, onLogout }: { title: string; subtitle?: string; onLogout: () => void }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
      </View>
      <NotificationBell />
      <Pressable onPress={onLogout} hitSlop={8}>
        <Text style={styles.logout}>Logout</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 4 }}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  toggle: { color: colors.primary, fontWeight: '600', marginLeft: 8 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 3, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segActive: { backgroundColor: colors.primary },
  segText: { fontWeight: '600', color: colors.text, fontSize: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#bfdbfe', fontSize: 13, marginTop: 2 },
  logout: { color: '#fff', fontWeight: '700' },

  kvKey: { width: 92, color: colors.muted, fontSize: 13 },
  kvVal: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '500' },
});
