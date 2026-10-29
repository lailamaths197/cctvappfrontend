import { Platform } from 'react-native';

/**
 * Backend base URL.
 *  - Android emulator reaches your computer at 10.0.2.2
 *  - iOS simulator can use localhost
 *  - A physical phone needs your computer's LAN IP, e.g. http://192.168.1.20:8000/api
 *    (set EXPO_PUBLIC_API_URL, and run Django with: python manage.py runserver 0.0.0.0:8000)
 */
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? fallback;
