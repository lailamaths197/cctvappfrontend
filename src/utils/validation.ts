// Pure validators: each returns an error message, or '' when the value is valid.
// They mirror the rules enforced by the Django backend so users see the same
// feedback instantly instead of waiting for a server round-trip.

export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/; // Indian mobile: 10 digits starting 6-9
export const PINCODE_REGEX = /^[1-9]\d{5}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;

export const validateFullName = (v: string): string => {
  const s = v.trim();
  if (!s) return 'Full name is required.';
  if (s.length < 3) return 'Name must be at least 3 characters.';
  if (s.length > 50) return 'Name must be at most 50 characters.';
  if (!NAME_REGEX.test(s)) return 'Use letters, spaces, . - and \' only.';
  return '';
};

export const validateEmail = (v: string): string => {
  const s = v.trim();
  if (!s) return 'Email is required.';
  if (!EMAIL_REGEX.test(s)) return 'Enter a valid email address.';
  return '';
};

export const normalizePhone = (v: string): string => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');

export const validatePhone = (v: string): string => {
  const s = normalizePhone(v);
  if (!s) return 'Phone number is required.';
  if (!/^\d+$/.test(s)) return 'Phone number can contain digits only.';
  if (s.length !== 10) return 'Phone number must be exactly 10 digits.';
  if (!PHONE_REGEX.test(s)) return 'Phone number must start with 6, 7, 8 or 9.';
  return '';
};

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

export const passwordChecks = (v: string): PasswordChecks => ({
  length: v.length >= 8,
  upper: /[A-Z]/.test(v),
  lower: /[a-z]/.test(v),
  digit: /\d/.test(v),
  special: /[^A-Za-z0-9]/.test(v),
});

export const validatePassword = (v: string): string => {
  if (!v) return 'Password is required.';
  const c = passwordChecks(v);
  if (!c.length) return 'Password must be at least 8 characters.';
  if (!c.upper || !c.lower) return 'Include both uppercase and lowercase letters.';
  if (!c.digit) return 'Include at least one number.';
  if (!c.special) return 'Include at least one special character.';
  return '';
};

export const validateConfirmPassword = (password: string, confirm: string): string => {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
};

export const validateRequired = (label: string, v: string, min = 1, max = 200): string => {
  const s = v.trim();
  if (!s) return `${label} is required.`;
  if (s.length < min) return `${label} must be at least ${min} characters.`;
  if (s.length > max) return `${label} must be at most ${max} characters.`;
  return '';
};

/** Service price: positive, at most 2 decimal places. */
export const validatePrice = (v: string): string => {
  const s = v.trim();
  if (!s) return 'Price is required.';
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) return 'Enter a valid amount, e.g. 1499 or 1499.50.';
  if (Number(s) <= 0) return 'Price must be greater than 0.';
  return '';
};

export const validatePincode = (v: string): string => {
  const s = v.trim();
  if (!s) return 'Pincode is required.';
  if (!PINCODE_REGEX.test(s)) return 'Enter a valid 6-digit pincode.';
  return '';
};
