export const colors = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  bg: '#f1f5f9',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#cbd5e1',
  danger: '#dc2626',
  success: '#15803d',
  warning: '#b45309',
};

export const statusColors: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  confirmed: { bg: '#dbeafe', fg: '#1e40af' },
  in_progress: { bg: '#ede9fe', fg: '#5b21b6' },
  completed: { bg: '#dcfce7', fg: '#166534' },
  cancelled: { bg: '#fee2e2', fg: '#991b1b' },
  paid: { bg: '#dcfce7', fg: '#166534' },
  unpaid: { bg: '#fee2e2', fg: '#991b1b' },
  created: { bg: '#fef3c7', fg: '#92400e' },
  failed: { bg: '#fee2e2', fg: '#991b1b' },
};
