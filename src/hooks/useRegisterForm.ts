import { useCallback, useMemo, useState } from 'react';

import { fieldErrors } from '../api/client';
import {
  normalizePhone,
  passwordChecks,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
} from '../utils/validation';

export interface RegisterValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export type RegisterField = keyof RegisterValues;

const EMPTY: RegisterValues = { fullName: '', email: '', phone: '', password: '', confirmPassword: '' };
const FIELDS: RegisterField[] = ['fullName', 'email', 'phone', 'password', 'confirmPassword'];

/** Map backend (snake_case) error keys onto this form's field names. */
const SERVER_KEY: Record<string, RegisterField> = {
  full_name: 'fullName',
  email: 'email',
  phone_number: 'phone',
  password: 'password',
  confirm_password: 'confirmPassword',
};

/**
 * Real-time registration validation.
 *  - errors are computed on every keystroke, but only SHOWN for fields the user
 *    has touched (or after a submit attempt), so the form doesn't open covered in red
 *  - `isValid` drives the submit button's disabled state
 *  - server-side errors (e.g. "email already exists") are merged into the same map
 */
export function useRegisterForm() {
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo<Record<RegisterField, string>>(
    () => ({
      fullName: validateFullName(values.fullName),
      email: validateEmail(values.email),
      phone: validatePhone(values.phone),
      password: validatePassword(values.password),
      confirmPassword: validateConfirmPassword(values.password, values.confirmPassword),
    }),
    [values],
  );

  const isValid = FIELDS.every((f) => !errors[f]);
  const checks = useMemo(() => passwordChecks(values.password), [values.password]);

  const setValue = useCallback((field: RegisterField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)); // clear stale server error
  }, []);

  const onBlur = useCallback((field: RegisterField) => setTouched((p) => ({ ...p, [field]: true })), []);

  /** The message to display under a field ('' = show nothing). */
  const errorFor = (field: RegisterField): string =>
    touched[field] || submitAttempted ? errors[field] || serverErrors[field] || '' : serverErrors[field] || '';

  /** Marks everything touched; returns the payload for the API if valid, else null. */
  const prepareSubmit = () => {
    setSubmitAttempted(true);
    if (!isValid) return null;
    return {
      full_name: values.fullName.trim().replace(/\s+/g, ' '),
      email: values.email.trim().toLowerCase(),
      phone_number: normalizePhone(values.phone),
      password: values.password,
      confirm_password: values.confirmPassword,
    };
  };

  const applyServerErrors = (err: unknown) => {
    const raw = fieldErrors(err);
    const mapped: Partial<Record<RegisterField, string>> = {};
    for (const [k, v] of Object.entries(raw)) if (SERVER_KEY[k]) mapped[SERVER_KEY[k]] = v;
    setServerErrors(mapped);
    return Object.keys(mapped).length > 0;
  };

  return { values, setValue, onBlur, errorFor, isValid, checks, prepareSubmit, applyServerErrors };
}
