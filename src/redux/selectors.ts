/**
 * Redux Selectors
 * Efficient state selectors for accessing monitoring and device control state
 */

import { AppState, SocialMediaActivity, ActivityAlert, ShutdownSchedule } from '../types/monitoring';

// Monitoring Selectors
export const monitoringSelectors = {
  // Get all activities
  getAllActivities: (state: AppState): SocialMediaActivity[] => state.monitoring.activities,

  // Get activities by platform
  getActivitiesByPlatform: (state: AppState, platform: string): SocialMediaActivity[] =>
    state.monitoring.activities.filter((a) => a.platform === platform),

  // Get all alerts
  getAllAlerts: (state: AppState): ActivityAlert[] => state.monitoring.alerts,

  // Get unacknowledged alerts
  getUnacknowledgedAlerts: (state: AppState): ActivityAlert[] =>
    state.monitoring.alerts.filter((a) => !a.acknowledged),

  // Get high-risk alerts
  getHighRiskAlerts: (state: AppState): ActivityAlert[] =>
    state.monitoring.alerts.filter((a) => a.riskLevel === 'high'),

  // Get platform stats
  getPlatformStats: (state: AppState) => state.monitoring.platformStats,

  // Get permissions
  getPermissions: (state: AppState) => state.monitoring.permissions,

  // Check if platform is permitted
  isPlatformPermitted: (state: AppState, platform: string): boolean =>
    state.monitoring.permissions.some((p) => p.platform === platform && p.granted),

  // Get monitoring status
  isMonitoring: (state: AppState): boolean => state.monitoring.isMonitoring,

  // Get sync status
  isSyncInProgress: (state: AppState): boolean => state.monitoring.syncInProgress,

  // Get last sync time
  getLastSyncTime: (state: AppState) => state.monitoring.lastSyncTime,

  // Get notification logs
  getNotificationLogs: (state: AppState) => state.monitoring.notificationLogs,

  // Get undelivered notifications
  getUndeliveredNotifications: (state: AppState) =>
    state.monitoring.notificationLogs.filter((n) => n.deliveryStatus === 'pending'),

  // Get activity count
  getActivityCount: (state: AppState): number => state.monitoring.activities.length,

  // Get alert count
  getAlertCount: (state: AppState): number => state.monitoring.alerts.length,

  // Get risk summary
  getRiskSummary: (state: AppState) => {
    const alerts = state.monitoring.alerts;
    return {
      highRiskCount: alerts.filter((a) => a.riskLevel === 'high').length,
      mediumRiskCount: alerts.filter((a) => a.riskLevel === 'medium').length,
      totalAlerts: alerts.length,
    };
  },
};

// Device Control Selectors
export const deviceSelectors = {
  // Get all schedules
  getAllSchedules: (state: AppState): ShutdownSchedule[] => state.deviceControl.schedules,

  // Get enabled schedules
  getEnabledSchedules: (state: AppState): ShutdownSchedule[] =>
    state.deviceControl.schedules.filter((s) => s.enabled),

  // Get countdown state
  getCountdownState: (state: AppState) => state.deviceControl.countdownState,

  // Check if countdown is active
  isCountdownActive: (state: AppState): boolean =>
    state.deviceControl.countdownState?.active ?? false,

  // Get countdown time remaining (in seconds)
  getCountdownTimeRemaining: (state: AppState): number =>
    state.deviceControl.countdownState?.secondsRemaining ?? 0,

  // Get device info
  getDeviceInfo: (state: AppState) => state.deviceControl.deviceInfo,

  // Get control events (history)
  getControlEvents: (state: AppState) => state.deviceControl.controlEvents,

  // Get recent control events
  getRecentControlEvents: (state: AppState, limit: number = 10) =>
    state.deviceControl.controlEvents.slice(-limit),

  // Get pending requests
  getPendingRequests: (state: AppState) => state.deviceControl.pendingRequests,

  // Get pending request count
  getPendingRequestCount: (state: AppState): number =>
    state.deviceControl.pendingRequests.length,

  // Check if device is online
  isDeviceOnline: (state: AppState): boolean =>
    state.deviceControl.deviceInfo?.healthCheck.online ?? false,

  // Get device battery level
  getDeviceBatteryLevel: (state: AppState): number | undefined =>
    state.deviceControl.deviceInfo?.healthCheck.batteryLevel,

  // Get device storage space
  getDeviceStorageSpace: (state: AppState): number | undefined =>
    state.deviceControl.deviceInfo?.healthCheck.storageSpace,

  // Get schedule for specific weekday
  getScheduleForWeekday: (state: AppState, weekday: number): ShutdownSchedule | undefined =>
    state.deviceControl.schedules.find((s) => s.weekday === weekday && s.enabled),

  // Get schedule count
  getScheduleCount: (state: AppState): number => state.deviceControl.schedules.length,

  // Get event count
  getEventCount: (state: AppState): number => state.deviceControl.controlEvents.length,

  // Get next scheduled shutdown
  getNextScheduledShutdown: (state: AppState) => {
    const now = new Date();
    const schedules = state.deviceControl.schedules.filter((s) => s.enabled);
    
    if (schedules.length === 0) return null;

    // Find earliest upcoming schedule
    const sortedSchedules = [...schedules].sort((a, b) => {
      const timeA = new Date();
      timeA.setHours(a.hour, a.minute, 0);
      const timeB = new Date();
      timeB.setHours(b.hour, b.minute, 0);

      return timeA.getTime() - timeB.getTime();
    });

    return sortedSchedules[0];
  },
};

// UI Selectors
export const uiSelectors = {
  // Get selected platform
  getSelectedPlatform: (state: AppState) => state.ui.selectedPlatform,

  // Get active alert
  getActiveAlert: (state: AppState) => state.ui.activeAlert,

  // Check if countdown is visible
  isCountdownVisible: (state: AppState): boolean => state.ui.showCountdown,
};

// Error Selectors
export const errorSelectors = {
  // Get monitoring error
  getMonitoringError: (state: AppState) => state.error.monitoringError,

  // Get device control error
  getControlError: (state: AppState) => state.error.controlError,

  // Check if there are any errors
  hasErrors: (state: AppState): boolean =>
    state.error.monitoringError !== null || state.error.controlError !== null,
};

// Combined Selectors
export const combinedSelectors = {
  // Get full app status
  getAppStatus: (state: AppState) => ({
    monitoring: {
      isActive: state.monitoring.isMonitoring,
      activityCount: state.monitoring.activities.length,
      alertCount: state.monitoring.alerts.length,
      lastSyncTime: state.monitoring.lastSyncTime,
    },
    device: {
      online: state.deviceControl.deviceInfo?.healthCheck.online ?? false,
      scheduleCount: state.deviceControl.schedules.length,
      countdownActive: state.deviceControl.countdownState?.active ?? false,
      pendingRequests: state.deviceControl.pendingRequests.length,
    },
    errors: {
      monitoring: state.error.monitoringError,
      control: state.error.controlError,
    },
  }),

  // Get dashboard data for parent app
  getDashboardData: (state: AppState) => ({
    activities: state.monitoring.activities.slice(-20), // Last 20 activities
    alerts: state.monitoring.alerts.filter((a) => !a.acknowledged), // Unacknowledged alerts
    stats: {
      totalActivities: state.monitoring.activities.length,
      activeAlerts: state.monitoring.alerts.filter((a) => !a.acknowledged).length,
      deviceOnline: state.deviceControl.deviceInfo?.healthCheck.online ?? false,
      nextShutdown: combinedSelectors.getNextScheduledShutdown(state),
    },
  }),

  // Get next scheduled action
  getNextScheduledShutdown: (state: AppState) => {
    const schedules = state.deviceControl.schedules.filter((s) => s.enabled);
    if (schedules.length === 0) return null;

    const now = new Date();
    const upcomingSchedules = schedules.filter((s) => {
      const scheduleTime = new Date();
      scheduleTime.setHours(s.hour, s.minute, 0);
      return scheduleTime.getTime() > now.getTime();
    });

    if (upcomingSchedules.length === 0) return null;

    upcomingSchedules.sort((a, b) => {
      const timeA = new Date();
      timeA.setHours(a.hour, a.minute, 0);
      const timeB = new Date();
      timeB.setHours(b.hour, b.minute, 0);
      return timeA.getTime() - timeB.getTime();
    });

    return upcomingSchedules[0];
  },
};
