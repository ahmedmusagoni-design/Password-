/**
 * Main Application Entry Point
 * Demonstrates integration of monitoring and device control services
 * Shows complete workflow from initialization to data sync
 */

import { createStore } from 'redux';
import { appStore, getAppState } from './redux/store';
import { monitoringActions, deviceActions, uiActions } from './redux/actions';
import {
  monitoringSelectors,
  deviceSelectors,
  errorSelectors,
  combinedSelectors,
} from './redux/selectors';
import { SocialMediaMonitoringService } from './services/SocialMediaMonitoringService';
import { DeviceControlService } from './services/DeviceControlService';
import { storage, initializeStorage } from './storage/StorageService';
import {
  initializeApiClient,
  getApiClient,
  ParentDashboardApiClient,
} from './api/ParentDashboardApi';
import { MockDataGenerator, seedMockData } from './mock/MockDataGenerator';
import {
  SocialMediaActivity,
  ShutdownSchedule,
  DeviceControlEvent,
  ActivityAlert,
} from './types/monitoring';

/**
 * Main Parental Control Application
 */
export class ParentalControlApp {
  private monitoringService: SocialMediaMonitoringService;
  private deviceControlService: DeviceControlService;
  private apiClient: ParentDashboardApiClient;
  private store = appStore;
  private syncInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    baseUrl: string = 'https://api.parentalcontrol.app',
    deviceId: string = 'device-001'
  ) {
    this.monitoringService = new SocialMediaMonitoringService();
    this.deviceControlService = new DeviceControlService();
    this.apiClient = initializeApiClient(baseUrl, deviceId);

    console.log('🚀 Parental Control App Initialized');
  }

  /**
   * Initialize application
   */
  async initialize(): Promise<void> {
    console.log('\n📱 Initializing Application...\n');

    try {
      // Initialize storage
      await initializeStorage();

      // Start monitoring
      await this.monitoringService.startMonitoring();
      this.store.dispatch(monitoringActions.setMonitoringActive(true));

      // Start health checks
      this.deviceControlService.startHealthChecks(5);

      // Seed mock data for demo
      await seedMockData(
        this.monitoringService,
        this.deviceControlService,
        storage
      );

      // Setup background tasks
      this.setupSyncTasks();
      this.setupHealthCheckTasks();

      console.log('✅ Application initialized successfully\n');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.store.dispatch(monitoringActions.setMonitoringError(String(error)));
      throw error;
    }
  }

  /**
   * Setup periodic sync tasks
   */
  private setupSyncTasks(): void {
    // Sync monitoring data every 30 seconds
    this.syncInterval = setInterval(async () => {
      try {
        this.store.dispatch(monitoringActions.setSyncInProgress(true));

        // Get current activities
        const activities = this.monitoringService.getActivities();

        // Sync to parent dashboard
        await this.apiClient.syncActivities(
          activities,
          monitoringSelectors.getLastSyncTime(this.store.getState())
        );

        // Sync alerts
        const alerts = this.monitoringService.getAlerts();
        const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

        if (unacknowledgedAlerts.length > 0) {
          await this.apiClient.notifyAlerts(unacknowledgedAlerts);
        }

        this.store.dispatch(monitoringActions.setLastSyncTime(new Date()));
        this.store.dispatch(monitoringActions.setSyncInProgress(false));

        console.log('✓ Data synced to parent dashboard');
      } catch (error) {
        console.error('✗ Sync failed:', error);
        this.store.dispatch(monitoringActions.setMonitoringError(String(error)));
      }
    }, 30000); // 30 seconds
  }

  /**
   * Setup health check tasks
   */
  private setupHealthCheckTasks(): void {
    // Send health check every minute
    this.healthCheckInterval = setInterval(async () => {
      try {
        const deviceInfo = this.deviceControlService.getDeviceInfo();
        if (!deviceInfo) return;

        const health = deviceInfo.healthCheck;
        const response = await this.apiClient.sendHealthCheck(
          health.batteryLevel ?? 0,
          health.storageSpace ?? 0,
          true
        );

        if (response.data?.pendingActions) {
          console.log('📥 Pending actions from parent:', response.data.pendingActions);
        }
      } catch (error) {
        console.error('✗ Health check failed:', error);
      }
    }, 60000); // 1 minute
  }

  /**
   * Demonstrate monitoring features
   */
  async demonstrateMonitoring(): Promise<void> {
    console.log('\n📊 DEMONSTRATING MONITORING FEATURES\n');

    // Get monitoring state
    const state = this.store.getState();

    // Get all activities
    const activities = monitoringSelectors.getAllActivities(state);
    console.log(`📱 Total activities: ${activities.length}`);

    // Get platform stats
    const stats = monitoringSelectors.getPlatformStats(state);
    stats.forEach((stat) => {
      console.log(
        `  ${stat.platform}: ${stat.totalTimeSpent} min, ${stat.activitiesCount} activities, ${stat.riskCount} risks`
      );
    });

    // Get alerts
    const alerts = monitoringSelectors.getAllAlerts(state);
    const highRiskAlerts = monitoringSelectors.getHighRiskAlerts(state);
    console.log(`\n⚠️ Total alerts: ${alerts.length}`);
    console.log(`🔴 High-risk alerts: ${highRiskAlerts.length}`);

    if (highRiskAlerts.length > 0) {
      console.log('\nHigh-risk activities detected:');
      highRiskAlerts.forEach((alert) => {
        console.log(`  - ${alert.description} [${alert.platform}]`);
      });
    }

    // Show risk summary
    const riskSummary = monitoringSelectors.getRiskSummary(state);
    console.log(`\n📈 Risk Summary:`);
    console.log(`  High Risk: ${riskSummary.highRiskCount}`);
    console.log(`  Medium Risk: ${riskSummary.mediumRiskCount}`);
    console.log(`  Total Alerts: ${riskSummary.totalAlerts}`);
  }

  /**
   * Demonstrate device control features
   */
  async demonstrateDeviceControl(): Promise<void> {
    console.log('\n⚙️ DEMONSTRATING DEVICE CONTROL FEATURES\n');

    const state = this.store.getState();

    // Get schedules
    const schedules = deviceSelectors.getAllSchedules(state);
    console.log(`📅 Total schedules: ${schedules.length}`);

    schedules.forEach((schedule) => {
      const weekdays = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
      ];
      const status = schedule.enabled ? '✓' : '✗';
      console.log(
        `  ${status} ${weekdays[schedule.weekday]} at ${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')} (Grace: ${schedule.gracePeriod} min)`
      );
    });

    // Get device info
    const deviceInfo = deviceSelectors.getDeviceInfo(state);
    if (deviceInfo) {
      console.log(`\n📱 Device Information:`);
      console.log(`  Device ID: ${deviceInfo.deviceId}`);
      console.log(`  Online: ${deviceInfo.healthCheck.online ? '🟢 Yes' : '🔴 No'}`);
      console.log(`  Battery: ${deviceInfo.healthCheck.batteryLevel?.toFixed(0)}%`);
      console.log(`  Storage: ${deviceInfo.healthCheck.storageSpace?.toFixed(0)}%`);
    }

    // Show upcoming shutdown
    const nextShutdown = combinedSelectors.getNextScheduledShutdown(state);
    if (nextShutdown) {
      console.log(`\n⏱️ Next Scheduled Shutdown:`);
      console.log(
        `  ${String(nextShutdown.hour).padStart(2, '0')}:${String(nextShutdown.minute).padStart(2, '0')}`
      );
    }

    // Get control events
    const events = deviceSelectors.getRecentControlEvents(state, 5);
    if (events.length > 0) {
      console.log(`\n📋 Recent Control Events (${events.length}):`);
      events.forEach((event) => {
        const status = event.success ? '✓' : '✗';
        console.log(`  ${status} ${event.action} - ${event.reason}`);
      });
    }
  }

  /**
   * Demonstrate remote shutdown flow
   */
  async demonstrateRemoteShutdown(): Promise<void> {
    console.log('\n🔌 DEMONSTRATING REMOTE SHUTDOWN FLOW\n');

    console.log('Parent requests device shutdown...');

    const success = await this.deviceControlService.processRemoteRequest({
      deviceId: 'device-001',
      action: 'shutdown',
      reason: 'bedtime',
      timestamp: new Date(),
      requestedBy: 'parent-001',
      requiresConfirmation: true,
      priority: 'normal',
    });

    if (success) {
      console.log('✓ Remote shutdown initiated');

      // Log the event in Redux
      const state = this.store.getState();
      const countdown = deviceSelectors.getCountdownState(state);
      if (countdown) {
        console.log(`⏱️ Countdown active: ${countdown.secondsRemaining}s`);
      }
    }
  }

  /**
   * Demonstrate full dashboard data export
   */
  async demonstrateDashboardExport(): Promise<void> {
    console.log('\n📊 EXPORTING DASHBOARD DATA\n');

    try {
      const dashboardData = await this.apiClient.fetchDashboardData(true, true, true, 24);

      console.log('Dashboard Data Exported:');
      console.log(`  Activities: ${dashboardData.data?.activities.length || 0}`);
      console.log(`  Alerts: ${dashboardData.data?.alerts.length || 0}`);
      console.log(`  Platforms Monitored: ${dashboardData.data?.platformStats.length || 0}`);

      if (dashboardData.data?.summary) {
        console.log(`  Device Online: ${dashboardData.data.summary.deviceOnline}`);
        console.log(`  Last Sync: ${dashboardData.data.summary.lastSync}`);
      }
    } catch (error) {
      console.error('✗ Dashboard export failed:', error);
    }
  }

  /**
   * Shutdown application
   */
  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down application...\n');

    // Clear intervals
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

    // Stop services
    this.monitoringService.stopMonitoring();
    this.deviceControlService.stopHealthChecks();

    // Close storage
    await storage.close();

    console.log('✅ Application shutdown complete\n');
  }

  /**
   * Get current app state (for testing/debugging)
   */
  getState() {
    return this.store.getState();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: any) => void) {
    return this.store.subscribe(() => listener(this.store.getState()));
  }
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  const app = new ParentalControlApp('https://api.parentalcontrol.app', 'device-demo-001');

  try {
    // Initialize
    await app.initialize();

    // Run demonstrations
    await app.demonstrateMonitoring();
    await app.demonstrateDeviceControl();
    await app.demonstrateDashboardExport();

    // Show app status
    const state = app.getState();
    const appStatus = combinedSelectors.getAppStatus(state);
    console.log('\n📊 APP STATUS:');
    console.log(JSON.stringify(appStatus, null, 2));

    // Cleanup
    setTimeout(() => app.shutdown(), 3000);
  } catch (error) {
    console.error('Application error:', error);
    await app.shutdown();
    process.exit(1);
  }
}

// Export for use as module
export { SocialMediaMonitoringService, DeviceControlService, MockDataGenerator };
