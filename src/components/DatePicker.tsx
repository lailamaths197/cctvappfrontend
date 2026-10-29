// Native (iOS / Android) date picker. The browser version is DatePicker.web.tsx;
// Metro picks the right file automatically from the platform extension.
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  minimumDate: Date;
}

const toDisplay = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function DatePicker({ value, onChange, minimumDate }: Props) {
  const [showAndroid, setShowAndroid] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <DateTimePicker value={value} mode="date" display="compact" minimumDate={minimumDate} onChange={(_, d) => d && onChange(d)} />
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setShowAndroid(true)} style={styles.btn}>
        <Text style={styles.text}>📅 {toDisplay(value)}</Text>
      </Pressable>
      {showAndroid && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          onChange={(e, d) => {
            setShowAndroid(false);
            if (e.type === 'set' && d) onChange(d);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  btn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: '#fff', marginBottom: 10 },
  text: { fontSize: 15, color: colors.text },
});
