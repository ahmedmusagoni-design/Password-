/**
 * Social Media Monitoring Types
 * Defines interfaces for all social media platform monitoring capabilities
 */

// Platform types
export type SocialMediaPlatform = 'instagram' | 'tiktok' | 'snapchat' | 'twitter' | 'youtube';

// Activity types per platform
export type InstagramActivityType = 'post' | 'story' | 'dm' | 'follower_change' | 'like' | 'comment';
export type TikTokActivityType = 'watch' | 'upload' | 'like' | 'comment' | 'duet' | 'stitch';
export type SnapchatActivityType = 'message' | 'story' | 'location_share' | 'snap_sent' | 'snap_received';
export type TwitterActivityType = 'tweet' | 'retweet' | 'like' | 'reply' | 'dm' | 'follow';
export type YouTubeActivityType = 'watch' | 'subscribe' | 'upload' | 'like' | 'comment' | 'playlist';

export type ActivityType = 
  | InstagramActivityType 
  | TikTokActivityType 
  | SnapchatActivityType 
  | TwitterActivityType 
  | YouTubeActivityType;

// Core monitoring types
export interface SocialMediaActivity {
  id: string;
  platform: SocialMediaPlatform;
  activityType: ActivityType;
  username?: string;
  timestamp: Date;
  description: string;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  keywords?: string[];
  duration?: number; // in minutes
}

export interface PlatformStats {
  platform: SocialMediaPlatform;
  username?: string;
  totalTimeSpent: number; // in minutes
  activitiesCount: number;
  lastActivityTime: Date;
  riskCount: number;
  followerCount?: number;
  followingCount?: number;
}

export interface ActivityAlert {
  id: string;
  platform: SocialMediaPlatform;
  activityId: string;
  riskLevel: 'high' | 'medium';
  keywords: string[];
  description: string;
  timestamp: Date;
  acknowledged: boolean;
  actionTaken?: string;
}

export interface MonitoringPermission {
  platform: SocialMediaPlatform;
  granted: boolean;
  timestamp: Date;
  scope: string[];
}

export interface PermissionRequest {
  platform: SocialMediaPlatform;
  requiredScopes: string[];
  optional?: boolean;
  reason: string;
}

export interface NotificationLog {
  id: string;
  parentNotified: boolean;
  notificationTime: Date;
  alertId: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  method: 'push' | 'email' | 'sms';
}

/**
 * Device Control Types
 * Defines interfaces for shutdown scheduling and remote control
 */

export type DeviceControlAction = 'shutdown' | 'restart' | 'lock' | 'unlock';
export type ShutdownReason = 'scheduled' | 'remote_trigger' | 'bedtime' | 'override' | 'emergency';

export interface ShutdownSchedule {
  id: string;
  weekday: number; // 0-6, Sunday-Saturday
  hour: number;
  minute: number;
  enabled: boolean;
  recurring: boolean;
  timezone: string;
  gracePeriod: number; // in minutes
  emergencyOverrideEnabled: boolean;
}

export interface DeviceControlEvent {
  id: string;
  action: DeviceControlAction;
  reason: ShutdownReason;
  timestamp: Date;
  initiatedBy: 'parent' | 'schedule' | 'system';
  scheduled: boolean;
  countdownSeconds?: number;
  completedAt?: Date;
  success: boolean;
  errorMessage?: string;
}

export interface CountdownState {
  active: boolean;
  secondsRemaining: number;
  action: DeviceControlAction;
  cancellable: boolean;
  countdownStartedAt: Date;
}

export interface HealthCheckStatus {
  lastCheck: Date;
  online: boolean;
  appVersion: string;
  osVersion: string;
  batteryLevel?: number;
  storageSpace?: number;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  osType: 'android' | 'ios';
  osVersion: string;
  appVersion: string;
  lastSyncTime: Date;
  healthCheck: HealthCheckStatus;
}

export interface RemoteShutdownRequest {
  deviceId: string;
  action: DeviceControlAction;
  reason: ShutdownReason;
  timestamp: Date;
  requestedBy: string; // parent ID
  requiresConfirmation: boolean;
  priority: 'normal' | 'urgent';
}

/**
 * Integrated Types
 */

export interface MonitoringState {
  activities: SocialMediaActivity[];
  platformStats: PlatformStats[];
  alerts: ActivityAlert[];
  permissions: MonitoringPermission[];
  notificationLogs: NotificationLog[];
  isMonitoring: boolean;
  syncInProgress: boolean;
  lastSyncTime?: Date;
}

export interface DeviceControlState {
  schedules: ShutdownSchedule[];
  controlEvents: DeviceControlEvent[];
  countdownState: CountdownState | null;
  deviceInfo: DeviceInfo | null;
  pendingRequests: RemoteShutdownRequest[];
  isHealthCheckScheduled: boolean;
}

export interface AppState {
  monitoring: MonitoringState;
  deviceControl: DeviceControlState;
  ui: {
    selectedPlatform: SocialMediaPlatform | null;
    activeAlert: ActivityAlert | null;
    showCountdown: boolean;
  };
  error: {
    monitoringError: string | null;
    controlError: string | null;
  };
}
