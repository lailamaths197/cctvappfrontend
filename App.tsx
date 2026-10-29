import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  const content = (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS !== 'web') return content;

  // On a laptop browser, keep the app as a centred phone-width column
  // instead of stretching the mobile layout across the whole window.
  return (
    <View style={styles.webOuter}>
      <View style={styles.webInner}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOuter: { flex: 1, alignItems: 'center', backgroundColor: '#0f172a' },
  webInner: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: colors.bg, overflow: 'hidden' },
});
