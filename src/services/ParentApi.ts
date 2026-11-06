import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LocationData } from '../types';

export interface ParentUser {
  id: string;
  name: string;
  email: string | null;
  role: 'parent' | 'child';
}

export interface FamilyChild {
  id: string;
  name: string;
  createdAt: string;
  lastSyncAt: string | null;
}

export interface UsageSummary {
  day: string;
  totalMinutes: number;
  categories: Array<{ category: string; minutes: number }>;
  source?: 'self_reported';
  updatedAt?: string;
}

export interface FamilyAlert {
  id: string;
  childId: string;
  type: 'sos' | 'usage_limit';
  createdAt: string;
  acknowledgedAt: string | null;
  location?: { latitude: number; longitude: number; accuracy: number };
}

export interface ControlRequest {
  id: string;
  childId: string;
  type: 'daily_limit' | 'focus_session';
  minutes: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

interface AuthResponse {
  token: string;
  expiresAt: number;
  user: ParentUser;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  authenticated?: boolean;
}

const TOKEN_KEY = 'parent-control-api-token';
const CHILD_DEVICE_KEY = 'parent-control-device-id';
const configuredUrl = Constants.expoConfig?.extra?.parentApiUrl;
const apiBaseUrl = typeof configuredUrl === 'string' ? configuredUrl.replace(/\/+$/, '') : '';

class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(route: string, options: RequestOptions = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('Parent API is not configured. Set EXPO_PUBLIC_PARENT_API_URL and restart Expo.');
  }
  if (Platform.OS === 'web') {
    throw new Error('Secure sign-in is currently supported on iOS and Android only.');
  }

  const token = options.authenticated ? await SecureStore.getItemAsync(TOKEN_KEY) : null;
  const response = await fetch(`${apiBaseUrl}${route}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The parent API returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload
      ? payload.error
      : null;
    throw new ApiError(
      typeof error === 'string' ? error : `Request failed (${response.status}).`,
      response.status,
    );
  }
  return payload as T;
}

async function storeSession(result: AuthResponse): Promise<ParentUser> {
  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  return result.user;
}

async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(CHILD_DEVICE_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    await SecureStore.setItemAsync(CHILD_DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export const parentApi = {
  isConfigured: Boolean(apiBaseUrl),
  canSignIn: Boolean(apiBaseUrl) && Platform.OS !== 'web',

  async registerParent(name: string, email: string, password: string): Promise<ParentUser> {
    const result = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    return storeSession(result);
  },

  async signIn(email: string, password: string): Promise<ParentUser> {
    const result = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return storeSession(result);
  },

  async linkChild(name: string, code: string): Promise<ParentUser> {
    const result = await request<AuthResponse>('/api/family/link', {
      method: 'POST',
      body: { name, code, deviceId: await getDeviceId() },
    });
    return storeSession(result);
  },

  async restoreSession(): Promise<ParentUser | null> {
    if (!apiBaseUrl || Platform.OS === 'web') return null;
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
    try {
      const result = await request<{ user: ParentUser }>('/api/auth/me', { authenticated: true });
      return result.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        return null;
      }
      throw error;
    }
  },

  async signOut(): Promise<void> {
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async createInvite(): Promise<{ code: string; expiresAt: number }> {
    return request<{ code: string; expiresAt: number }>(
      '/api/family/invites',
      { method: 'POST', authenticated: true },
    );
  },

  async getChildren(): Promise<FamilyChild[]> {
    const result = await request<{ children: FamilyChild[] }>('/api/family/children', { authenticated: true });
    return result.children;
  },

  async getUsage(childId: string, day: string): Promise<UsageSummary> {
    const result = await request<{ usage: UsageSummary }>(
      `/api/family/children/${encodeURIComponent(childId)}/usage?day=${encodeURIComponent(day)}`,
      { authenticated: true },
    );
    return result.usage;
  },

  async submitSelfReportedUsage(day: string, totalMinutes: number): Promise<void> {
    await request('/api/devices/sync', {
      method: 'POST',
      authenticated: true,
      body: { day, totalMinutes, categories: [] },
    });
  },

  async getAlerts(): Promise<FamilyAlert[]> {
    const result = await request<{ alerts: FamilyAlert[] }>('/api/family/alerts', { authenticated: true });
    return result.alerts;
  },

  async acknowledgeAlert(alertId: string): Promise<void> {
    await request(`/api/family/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: 'POST',
      authenticated: true,
    });
  },

  async requestDailyLimit(childId: string, minutes: number): Promise<void> {
    await request(`/api/family/children/${encodeURIComponent(childId)}/control-requests`, {
      method: 'POST',
      authenticated: true,
      body: { type: 'daily_limit', minutes },
    });
  },

  async getPendingControlRequests(): Promise<ControlRequest[]> {
    const result = await request<{ requests: ControlRequest[] }>('/api/devices/control-requests', {
      authenticated: true,
    });
    return result.requests;
  },

  async respondToControlRequest(requestId: string, status: 'accepted' | 'declined'): Promise<void> {
    await request(`/api/devices/control-requests/${encodeURIComponent(requestId)}/respond`, {
      method: 'POST',
      authenticated: true,
      body: { status },
    });
  },

  async sendSosAlert(location?: LocationData): Promise<void> {
    await request('/api/devices/alerts', {
      method: 'POST',
      authenticated: true,
      body: {
        type: 'sos',
        ...(location ? {
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
        } : {}),
      },
    });
  },
};
