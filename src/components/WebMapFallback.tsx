import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mocks the native Marker component for the browser bundler
export const Marker = () => null;

// Provides a clean, styled visual placeholder inside the web dashboard
export default function MapView({ children, region, onPress }: any) {
  return (
    <View style={styles.webMapPlaceholder}>
      <Text style={styles.webMapText}>🛰️ Interactive Live GPS Map tracking active</Text>
      <Text style={styles.webSubText}>
        {region ? `Lat: ${region.latitude.toFixed(4)}, Lon: ${region.longitude.toFixed(4)}` : 'Resolving sat position...'}
      </Text>
      <Text style={styles.webHintText}>[Targeting optimization locked for Android / iOS mobile emulators]</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  webMapText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  webSubText: {
    fontSize: 12,
    color: '#0f172a',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  webHintText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
});