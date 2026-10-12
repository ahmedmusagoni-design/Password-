/**
 * Core type definitions for the parental control app
 */

// Device Activity Types
export interface AppUsageData {
  appName: string;
  packageName: string;
  duration: number; // in milliseconds
  timestamp: number; // Unix timestamp
  category?: string; // e.g., 'social', 'games', 'education'
}

export interface DailyScreenTime {
  date: string; // YYYY-MM-DD format
  totalDuration: number; // in milliseconds
  apps: AppUsageData[];
  alerts: ScreenTimeAlert[];
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  days: DailyScreenTime[];
  averageDaily: number; // in milliseconds
  totalWeekly: number; // in milliseconds
}

export interface ScreenTimeAlert {
  id: string;
  timestamp: number;
  message: string;
  type: 'usage_limit' | 'warning' | 'critical';
  acknowledged: boolean;
}

// SOS Feature Types
export interface SOSAlert {
  id: string;
  childId: string;
  childName: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  reason: string;
  status: 'sent' | 'failed' | 'acknowledged';
  retryCount: number;
  maxRetries: number;
}

export interface SOSHistoryEntry {
  id: string;
  alert: SOSAlert;
  parentNotified: boolean;
  parentResponseTime?: number; // in milliseconds
  notes?: string;
}

// User/Parent Configuration
export interface ParentConfig {
  parentId: string;
  parentName: string;
  email: string;
  phoneNumber: string;
  childrenIds: string[];
  screenTimeLimit: number; // in milliseconds per day
  alertThreshold: number; // percentage of daily limit
  notificationPreferences: NotificationPrefs;
}

export interface NotificationPrefs {
  enablePushNotifications: boolean;
  enableSMS: boolean;
  enableEmail: boolean;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

export interface ChildConfig {
  childId: string;
  childName: string;
  deviceId: string;
  birthDate: string; // YYYY-MM-DD
  parentIds: string[];
  screenTimeLimit: number; // daily limit in milliseconds
  blockedApps: string[]; // package names
  allowedApps?: string[]; // if set, only these are allowed
}

// Background Service Types
export interface AppTrackerState {
  isRunning: boolean;
  lastUpdate: number;
  currentApp?: string;
  sessionData: AppUsageData[];
  uploadQueue: AppUsageData[];
  isSyncing: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// Homework Mode Types
export interface HomeworkSchedule {
  id: string;
  childId: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, where 0 = Sunday
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BlockedApp {
  id: string;
  packageName: string;
  displayName: string;
  category: 'social' | 'entertainment' | 'other';
  icon?: string; // base64 or URI
}

export interface HomeworkSession {
  id: string;
  childId: string;
  scheduleId: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  status: 'active' | 'completed' | 'cancelled';
  blockedAppAttempts: BlockedAppAttempt[];
  breaksTaken: BreakTime[];
  parentOverrides: ParentOverride[];
}

export interface BlockedAppAttempt {
  id: string;
  sessionId: string;
  appId: string;
  appName: string;
  timestamp: number;
  parentNotified: boolean;
  parentResponse?: 'approved' | 'denied';
  responseTime?: number; // milliseconds from attempt
}

export interface BreakTime {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number; // in milliseconds
  requestedByChild: boolean;
}

export interface ParentOverride {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'extend_session' | 'allow_app' | 'end_early' | 'disable_homework';
  reason?: string;
  createdBy: string; // parent ID
}

export interface HomeworkModeState {
  isActive: boolean;
  currentSession: HomeworkSession | null;
  schedules: HomeworkSchedule[];
  blockedApps: BlockedApp[];
  recentAttempts: BlockedAppAttempt[];
  breakTimeAvailable: boolean;
  nextScheduleStart?: number; // Unix timestamp
  nextScheduleEnd?: number;
  loading: boolean;
  error: string | null;
  lastSync: number;
}

// Redux State Shape
export interface RootState {
  screenTime: ScreenTimeState;
  sos: SOSState;
  auth: AuthState;
  app: AppState;
  homeworkMode: HomeworkModeState;
}

export interface ScreenTimeState {
  dailyStats: DailyScreenTime | null;
  weeklyStats: WeeklyStats | null;
  allTimeApps: AppUsageData[];
  loading: boolean;
  error: string | null;
  lastSync: number;
}

export interface SOSState {
  alerts: SOSAlert[];
  history: SOSHistoryEntry[];
  isSOSActive: boolean;
  lastSOSTime: number | null;
  loading: boolean;
  error: string | null;
}

export interface AuthState {
  userId: string | null;
  userType: 'parent' | 'child';
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface AppState {
  isOnline: boolean;
  backgroundServiceRunning: boolean;
  currentLocation?: LocationData;
  lastLocationUpdate: number;
  appVersion: string;
  deviceId: string;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SyncResponse {
  uploadedCount: number;
  failedCount: number;
  nextSyncTime: number;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  MainApp: undefined;
  ScreenTime: undefined;
  SOSHistory: undefined;
  Settings: undefined;
};

export type ScreenTimeStackParamList = {
  ScreenTimeOverview: undefined;
  AppBreakdown: undefined;
  WeeklyTrends: undefined;
};
