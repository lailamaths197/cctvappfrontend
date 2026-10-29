import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import BookingScreen from '../screens/BookingScreen';
import AdminDashboard from '../screens/dashboards/AdminDashboard';
import CustomerDashboard from '../screens/dashboards/CustomerDashboard';
import TechnicianDashboard from '../screens/dashboards/TechnicianDashboard';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Role-based routing. Only the screens for the CURRENT role are registered, so a
 * customer cannot navigate to the admin dashboard even by accident.
 * (The real security boundary is still the backend permissions.)
 */
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user.role === 'customer' ? (
        <>
          <Stack.Screen name="CustomerHome" component={CustomerDashboard} />
          <Stack.Screen
            name="Booking"
            component={BookingScreen}
            options={{ headerShown: true, title: 'Book a Service', headerTintColor: colors.primary }}
          />
        </>
      ) : user.role === 'technician' ? (
        <Stack.Screen name="TechnicianHome" component={TechnicianDashboard} />
      ) : (
        <Stack.Screen name="AdminHome" component={AdminDashboard} />
      )}
    </Stack.Navigator>
  );
}
