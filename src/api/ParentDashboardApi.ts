/**
 * API Interfaces for Parent Dashboard
 * Defines data structures and APIs for communicating with parent app backend
 */

import {
  SocialMediaActivity,
  ActivityAlert,
  ShutdownSchedule,
  DeviceControlEvent,
  PlatformStats,
  DeviceInfo,
} from '../types/monitoring';

/**
 * API Request/Response wrappers
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface ApiRequest<T> {
  timestamp: Date;
  deviceId: string;
  version: string;
  data: T;
}

/**
 * Activity sync API interfaces
 */
export interface ActivitySyncRequest extends ApiRequest<SocialMediaActivity[]> {
  lastSyncTime?: Date;
}

export interface ActivitySyncResponse extends ApiResponse<{
  activities: SocialMediaActivity[];
  nextSyncTime: Date;
  totalActivitiesStored: number;
}> {}

/**
 * Alert API interfaces
 */
export interface AlertNotificationRequest extends ApiRequest<ActivityAlert[]> {
  platformFilter?: string[];
}

export interface AlertAcknowledgmentRequest extends ApiRequest<{
  alertId: string;
  actionTaken?: string;
}> {}

/**
 * Schedule sync API interfaces
 */
export interface ScheduleSyncRequest extends ApiRequest<ShutdownSchedule[]> {}

export interface ScheduleUpdateRequest extends ApiRequest<{
  scheduleId: string;
  updates: Partial<ShutdownSchedule>;
}> {}

/**
 * Device control API interfaces
 */
export interface RemoteShutdownRequest extends ApiRequest<{
  action: 'shutdown' | 'restart' | 'lock';
  reason: string;
  priority: 'normal' | 'urgent';
  requiresConfirmation: boolean;
}> {}

export interface ControlEventLogRequest extends ApiRequest<DeviceControlEvent[]> {}

/**
 * Health check API interfaces
 */
export interface HealthCheckRequest extends ApiRequest<{
  batteryLevel: number;
  storageSpace: number;
  appRunning: boolean;
}> {}

export interface HealthCheckResponse extends ApiResponse<{
  serverTime: Date;
  acknowledged: boolean;
  pendingActions?: any[];
}> {}

/**
 * Dashboard data API interface
 */
export interface DashboardDataRequest extends ApiRequest<{
  includeActivityHistory: boolean;
  includeAlerts: boolean;
  includeDeviceStatus: boolean;
  timeRangeHours?: number;
}> {}

export interface DashboardDataResponse extends ApiResponse<{
  activities: SocialMediaActivity[];
  alerts: ActivityAlert[];
  platformStats: PlatformStats[];
  deviceInfo: DeviceInfo;
  schedules: ShutdownSchedule[];
  recentEvents: DeviceControlEvent[];
  summary: {
    totalActivities: number;
    activeAlerts: number;
    deviceOnline: boolean;
    lastSync: Date;
  };
}> {}

/**
 * Parent Dashboard API Client
 * Handles all communication with parent app backend
 */
export class ParentDashboardApiClient {
  private baseUrl: string;
  private deviceId: string;
  private authToken?: string;
  private timeout: number = 30000; // 30 seconds

  constructor(baseUrl: string, deviceId: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.deviceId = deviceId;
    this.authToken = authToken;
  }

  /**
   * Sync activities to parent dashboard
   */
  async syncActivities(
    activities: SocialMediaActivity[],
    lastSyncTime?: Date
  ): Promise<ActivitySyncResponse> {
    const request: ActivitySyncRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: activities,
      lastSyncTime,
    };

    return this.makeRequest('/sync/activities', 'POST', request);
  }

  /**
   * Notify parent of alerts
   */
  async notifyAlerts(
    alerts: ActivityAlert[],
    platformFilter?: string[]
  ): Promise<ApiResponse<void>> {
    const request: AlertNotificationRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: alerts,
      platformFilter,
    };

    return this.makeRequest('/alerts/notify', 'POST', request);
  }

  /**
   * Acknowledge alert from parent
   */
  async acknowledgeAlert(
    alertId: string,
    actionTaken?: string
  ): Promise<ApiResponse<void>> {
    const request: AlertAcknowledgmentRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: { alertId, actionTaken },
    };

    return this.makeRequest('/alerts/acknowledge', 'POST', request);
  }

  /**
   * Sync schedules from parent
   */
  async syncSchedules(
    schedules: ShutdownSchedule[]
  ): Promise<ApiResponse<ShutdownSchedule[]>> {
    const request: ScheduleSyncRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: schedules,
    };

    return this.makeRequest('/schedules/sync', 'POST', request);
  }

  /**
   * Receive remote shutdown request from parent
   */
  async processRemoteShutdown(
    action: 'shutdown' | 'restart' | 'lock',
    reason: string,
    priority: 'normal' | 'urgent' = 'normal',
    requiresConfirmation: boolean = true
  ): Promise<ApiResponse<void>> {
    const request: RemoteShutdownRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: {
        action,
        reason,
        priority,
        requiresConfirmation,
      },
    };

    return this.makeRequest('/device/control', 'POST', request);
  }

  /**
   * Upload control event log
   */
  async uploadControlEvents(
    events: DeviceControlEvent[]
  ): Promise<ApiResponse<void>> {
    const request: ControlEventLogRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: events,
    };

    return this.makeRequest('/device/events/log', 'POST', request);
  }

  /**
   * Send health check to backend
   */
  async sendHealthCheck(
    batteryLevel: number,
    storageSpace: number,
    appRunning: boolean
  ): Promise<HealthCheckResponse> {
    const request: HealthCheckRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: {
        batteryLevel,
        storageSpace,
        appRunning,
      },
    };

    return this.makeRequest('/health/check', 'POST', request);
  }

  /**
   * Fetch complete dashboard data for parent
   */
  async fetchDashboardData(
    includeActivityHistory: boolean = true,
    includeAlerts: boolean = true,
    includeDeviceStatus: boolean = true,
    timeRangeHours: number = 24
  ): Promise<DashboardDataResponse> {
    const request: DashboardDataRequest = {
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: '1.0.0',
      data: {
        includeActivityHistory,
        includeAlerts,
        includeDeviceStatus,
        timeRangeHours,
      },
    };

    return this.makeRequest('/dashboard/data', 'POST', request);
  }

  /**
   * Internal: Make HTTP request with error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any
  ): Promise<T> {
    try {
      console.log(`[API] ${method} ${this.baseUrl}${endpoint}`);

      // In a real app, use axios or fetch:
      // const response = await axios({
      //   method,
      //   url: `${this.baseUrl}${endpoint}`,
      //   data,
      //   headers: {
      //     'Authorization': `Bearer ${this.authToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   timeout: this.timeout,
      // });
      //
      // return response.data;

      // For now, simulate the request
      console.log(`[API] Request payload:`, data);
      
      return {
        success: true,
        timestamp: new Date(),
      } as any as T;
    } catch (error) {
      console.error(`[API] Error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Set base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
}

/**
 * Export singleton API client (configured in main app)
 */
let apiClient: ParentDashboardApiClient;

export function initializeApiClient(
  baseUrl: string,
  deviceId: string,
  authToken?: string
): ParentDashboardApiClient {
  apiClient = new ParentDashboardApiClient(baseUrl, deviceId, authToken);
  console.log(`✓ API client initialized (${baseUrl})`);
  return apiClient;
}

export function getApiClient(): ParentDashboardApiClient {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initializeApiClient first.');
  }
  return apiClient;
}
