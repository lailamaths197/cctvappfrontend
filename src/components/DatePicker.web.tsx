// Browser date picker: a native <input type="date"> (react-native-web lets us render DOM elements).
import React from 'react';
import { View } from 'react-native';

import { colors } from '../theme';

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  minimumDate: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function DatePicker({ value, onChange, minimumDate }: Props) {
  return (
    <View style={{ marginBottom: 10 }}>
      {React.createElement('input', {
        type: 'date',
        value: toISO(value),
        min: toISO(minimumDate),
        onChange: (e: { target: { value: string } }) => {
          const [y, m, d] = e.target.value.split('-').map(Number);
          if (!y || !m || !d) return; // cleared by the user
          const picked = new Date(y, m - 1, d);
          if (picked >= new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate())) onChange(picked);
        },
        style: {
          width: '100%',
          boxSizing: 'border-box',
          padding: 12,
          fontSize: 15,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          backgroundColor: '#fff',
          fontFamily: 'inherit',
        },
      })}
    </View>
  );
}
