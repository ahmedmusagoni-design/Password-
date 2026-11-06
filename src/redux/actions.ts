/**
 * Redux Action Types and Action Creators
 * Defines all actions for social media monitoring and device control
 */

import {
  SocialMediaActivity,
  ActivityAlert,
  MonitoringPermission,
  NotificationLog,
  ShutdownSchedule,
  DeviceControlEvent,
  CountdownState,
  RemoteShutdownRequest,
  DeviceInfo,
} from '../types/monitoring';

// MONITORING ACTIONS
export const MONITORING_ACTIONS = {
  // Activity
  ADD_ACTIVITY: 'MONITORING/ADD_ACTIVITY',
  CLEAR_ACTIVITIES: 'MONITORING/CLEAR_ACTIVITIES',

  // Alerts
  CREATE_ALERT: 'MONITORING/CREATE_ALERT',
  ACKNOWLEDGE_ALERT: 'MONITORING/ACKNOWLEDGE_ALERT',
  CLEAR_ALERTS: 'MONITORING/CLEAR_ALERTS',

  // Permissions
  REQUEST_PERMISSION: 'MONITORING/REQUEST_PERMISSION',
  GRANT_PERMISSION: 'MONITORING/GRANT_PERMISSION',
  REVOKE_PERMISSION: 'MONITORING/REVOKE_PERMISSION',

  // Status
  SET_MONITORING_ACTIVE: 'MONITORING/SET_MONITORING_ACTIVE',
  SET_SYNC_IN_PROGRESS: 'MONITORING/SET_SYNC_IN_PROGRESS',
  SET_LAST_SYNC_TIME: 'MONITORING/SET_LAST_SYNC_TIME',

  // Notifications
  ADD_NOTIFICATION_LOG: 'MONITORING/ADD_NOTIFICATION_LOG',
  UPDATE_NOTIFICATION_STATUS: 'MONITORING/UPDATE_NOTIFICATION_STATUS',

  // Errors
  SET_MONITORING_ERROR: 'MONITORING/SET_MONITORING_ERROR',
};

// DEVICE CONTROL ACTIONS
export const DEVICE_ACTIONS = {
  // Schedules
  CREATE_SCHEDULE: 'DEVICE/CREATE_SCHEDULE',
  UPDATE_SCHEDULE: 'DEVICE/UPDATE_SCHEDULE',
  DELETE_SCHEDULE: 'DEVICE/DELETE_SCHEDULE',
  SET_SCHEDULE_ENABLED: 'DEVICE/SET_SCHEDULE_ENABLED',

  // Control Events
  ADD_CONTROL_EVENT: 'DEVICE/ADD_CONTROL_EVENT',
  CLEAR_CONTROL_EVENTS: 'DEVICE/CLEAR_CONTROL_EVENTS',

  // Countdown
  START_COUNTDOWN: 'DEVICE/START_COUNTDOWN',
  TICK_COUNTDOWN: 'DEVICE/TICK_COUNTDOWN',
  CANCEL_COUNTDOWN: 'DEVICE/CANCEL_COUNTDOWN',

  // Device Info
  SET_DEVICE_INFO: 'DEVICE/SET_DEVICE_INFO',
  UPDATE_HEALTH_CHECK: 'DEVICE/UPDATE_HEALTH_CHECK',

  // Requests
  ADD_PENDING_REQUEST: 'DEVICE/ADD_PENDING_REQUEST',
  REMOVE_PENDING_REQUEST: 'DEVICE/REMOVE_PENDING_REQUEST',

  // Errors
  SET_CONTROL_ERROR: 'DEVICE/SET_CONTROL_ERROR',
};

// UI ACTIONS
export const UI_ACTIONS = {
  SET_SELECTED_PLATFORM: 'UI/SET_SELECTED_PLATFORM',
  SET_ACTIVE_ALERT: 'UI/SET_ACTIVE_ALERT',
  TOGGLE_COUNTDOWN_DISPLAY: 'UI/TOGGLE_COUNTDOWN_DISPLAY',
};

// Action Creators - Monitoring
export const monitoringActions = {
  addActivity: (activity: SocialMediaActivity) => ({
    type: MONITORING_ACTIONS.ADD_ACTIVITY,
    payload: activity,
  }),

  clearActivities: () => ({
    type: MONITORING_ACTIONS.CLEAR_ACTIVITIES,
  }),

  createAlert: (alert: ActivityAlert) => ({
    type: MONITORING_ACTIONS.CREATE_ALERT,
    payload: alert,
  }),

  acknowledgeAlert: (alertId: string, actionTaken?: string) => ({
    type: MONITORING_ACTIONS.ACKNOWLEDGE_ALERT,
    payload: { alertId, actionTaken },
  }),

  clearAlerts: () => ({
    type: MONITORING_ACTIONS.CLEAR_ALERTS,
  }),

  grantPermission: (permission: MonitoringPermission) => ({
    type: MONITORING_ACTIONS.GRANT_PERMISSION,
    payload: permission,
  }),

  revokePermission: (platform: string) => ({
    type: MONITORING_ACTIONS.REVOKE_PERMISSION,
    payload: platform,
  }),

  setMonitoringActive: (active: boolean) => ({
    type: MONITORING_ACTIONS.SET_MONITORING_ACTIVE,
    payload: active,
  }),

  setSyncInProgress: (inProgress: boolean) => ({
    type: MONITORING_ACTIONS.SET_SYNC_IN_PROGRESS,
    payload: inProgress,
  }),

  setLastSyncTime: (timestamp: Date) => ({
    type: MONITORING_ACTIONS.SET_LAST_SYNC_TIME,
    payload: timestamp,
  }),

  addNotificationLog: (log: NotificationLog) => ({
    type: MONITORING_ACTIONS.ADD_NOTIFICATION_LOG,
    payload: log,
  }),

  setMonitoringError: (error: string | null) => ({
    type: MONITORING_ACTIONS.SET_MONITORING_ERROR,
    payload: error,
  }),
};

// Action Creators - Device Control
export const deviceActions = {
  createSchedule: (schedule: ShutdownSchedule) => ({
    type: DEVICE_ACTIONS.CREATE_SCHEDULE,
    payload: schedule,
  }),

  updateSchedule: (id: string, updates: Partial<ShutdownSchedule>) => ({
    type: DEVICE_ACTIONS.UPDATE_SCHEDULE,
    payload: { id, updates },
  }),

  deleteSchedule: (id: string) => ({
    type: DEVICE_ACTIONS.DELETE_SCHEDULE,
    payload: id,
  }),

  setScheduleEnabled: (id: string, enabled: boolean) => ({
    type: DEVICE_ACTIONS.SET_SCHEDULE_ENABLED,
    payload: { id, enabled },
  }),

  addControlEvent: (event: DeviceControlEvent) => ({
    type: DEVICE_ACTIONS.ADD_CONTROL_EVENT,
    payload: event,
  }),

  clearControlEvents: () => ({
    type: DEVICE_ACTIONS.CLEAR_CONTROL_EVENTS,
  }),

  startCountdown: (countdownState: CountdownState) => ({
    type: DEVICE_ACTIONS.START_COUNTDOWN,
    payload: countdownState,
  }),

  tickCountdown: () => ({
    type: DEVICE_ACTIONS.TICK_COUNTDOWN,
  }),

  cancelCountdown: () => ({
    type: DEVICE_ACTIONS.CANCEL_COUNTDOWN,
  }),

  setDeviceInfo: (info: DeviceInfo) => ({
    type: DEVICE_ACTIONS.SET_DEVICE_INFO,
    payload: info,
  }),

  addPendingRequest: (request: RemoteShutdownRequest) => ({
    type: DEVICE_ACTIONS.ADD_PENDING_REQUEST,
    payload: request,
  }),

  removePendingRequest: (requestId: string) => ({
    type: DEVICE_ACTIONS.REMOVE_PENDING_REQUEST,
    payload: requestId,
  }),

  setControlError: (error: string | null) => ({
    type: DEVICE_ACTIONS.SET_CONTROL_ERROR,
    payload: error,
  }),
};

// Action Creators - UI
export const uiActions = {
  setSelectedPlatform: (platform: string | null) => ({
    type: UI_ACTIONS.SET_SELECTED_PLATFORM,
    payload: platform,
  }),

  setActiveAlert: (alert: ActivityAlert | null) => ({
    type: UI_ACTIONS.SET_ACTIVE_ALERT,
    payload: alert,
  }),

  toggleCountdownDisplay: () => ({
    type: UI_ACTIONS.TOGGLE_COUNTDOWN_DISPLAY,
  }),
};
