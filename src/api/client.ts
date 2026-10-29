import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_URL } from '../config';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/**
 * Token storage:  phone -> encrypted SecureStore,  browser -> localStorage
 * (expo-secure-store has no web implementation).
 */
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* storage blocked: user simply has to log in again next time */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const tokenStore = {
  async setTokens(access: string, refresh?: string) {
    await storage.set(ACCESS_KEY, access);
    if (refresh) await storage.set(REFRESH_KEY, refresh);
  },
  getAccess: () => storage.get(ACCESS_KEY),
  getRefresh: () => storage.get(REFRESH_KEY),
  async clear() {
    await storage.remove(ACCESS_KEY);
    await storage.remove(REFRESH_KEY);
  },
};

let onAuthLost: (() => void) | null = null;
/** AuthContext registers this so a failed token refresh logs the user out. */
export const setAuthLostHandler = (fn: (() => void) | null) => {
  onAuthLost = fn;
};

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
    await tokenStore.setTokens(data.access, data.refresh);
    return data.access as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isLogin = original?.url?.includes('/auth/login');
    if (error.response?.status === 401 && original && !original._retry && !isLogin) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null));
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      await tokenStore.clear();
      onAuthLost?.();
    }
    return Promise.reject(error);
  },
);

/** Turn any DRF / network error into one readable sentence. */
export function errorMessage(err: unknown): string {
  const e = err as AxiosError<any>;
  if (!e?.response) return 'Cannot reach the server. Check your connection and API URL.';
  const data = e.response.data;
  if (typeof data === 'string') return 'Something went wrong on the server.';
  if (data?.detail) return String(data.detail);
  if (Array.isArray(data)) return data.join(' ');
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${flatten(v)}`)
      .join('\n');
  }
  return 'Something went wrong.';
}

/** DRF can nest errors (e.g. one entry per uploaded file) - flatten them to text. */
function flatten(v: unknown): string {
  if (Array.isArray(v)) return v.map(flatten).join(' ');
  if (v && typeof v === 'object') return Object.values(v as object).map(flatten).join(' ');
  return String(v);
}

/** Field-level errors from a DRF 400 response, e.g. { email: 'Already exists.' }. */
export function fieldErrors(err: unknown): Record<string, string> {
  const data = (err as AxiosError<any>)?.response?.data;
  const out: Record<string, string> = {};
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data)) out[k] = flatten(v);
  }
  return out;
}
