/**
 * Integration Guide & Usage Examples
 * Complete walkthrough of implementing the parental control app
 */

// ============================================================================
// 1. INITIALIZATION
// ============================================================================

import { ParentalControlApp } from './index';

// Create app instance
const app = new ParentalControlApp(
  'https://api.parentalcontrol.app',
  'child-device-001'
);

// Initialize all services
await app.initialize();

// ============================================================================
// 2. MONITORING SETUP
// ============================================================================

import { SocialMediaMonitoringService } from './services/SocialMediaMonitoringService';

const monitoring = new SocialMediaMonitoringService();

// Request permissions for each platform
await monitoring.requestPermission({
  platform: 'instagram',
  requiredScopes: ['activity_read', 'follower_read', 'dm_read'],
  reason: 'Monitor activity for parental control'
});

// Start monitoring
await monitoring.startMonitoring();

// Add activity (would come from native API in real app)
monitoring.addActivity({
  id: 'act-001',
  platform: 'instagram',
  activityType: 'post',
  username: 'john_doe',
  timestamp: new Date(),
  description: 'Posted a photo',
  metadata: { likes: 42, comments: 5 },
  riskLevel: 'low'
});

// Access activities
const activities = monitoring.getActivities();
const alerts = monitoring.getAlerts();
const stats = monitoring.getPlatformStats();

// ============================================================================
// 3. DEVICE CONTROL SETUP
// ============================================================================

import { DeviceControlService } from './services/DeviceControlService';

const deviceControl = new DeviceControlService();

// Create shutdown schedule (10 PM every day)
deviceControl.createSchedule({
  weekday: 0, // Sunday
  hour: 22,
  minute: 0,
  enabled: true,
  recurring: true,
  timezone: 'UTC',
  gracePeriod: 5, // 5-minute warning
  emergencyOverrideEnabled: true
});

// Start periodic health checks
deviceControl.startHealthChecks(5); // Every 5 minutes

// Get device info
const deviceInfo = deviceControl.getDeviceInfo();

// ============================================================================
// 4. REDUX STATE MANAGEMENT
// ============================================================================

import { appStore } from './redux/store';
import { monitoringActions, deviceActions } from './redux/actions';
import { monitoringSelectors, deviceSelectors } from './redux/selectors';

// Dispatch actions
appStore.dispatch(monitoringActions.addActivity({
  id: 'act-002',
  platform: 'tiktok',
  activityType: 'watch',
  timestamp: new Date(),
  description: 'Watched a video',
  metadata: { duration: 5 },
  riskLevel: 'low'
}));

// Select state
const state = appStore.getState();
const allActivities = monitoringSelectors.getAllActivities(state);
const highRiskAlerts = monitoringSelectors.getHighRiskAlerts(state);
const schedules = deviceSelectors.getAllSchedules(state);
const isCountdownActive = deviceSelectors.isCountdownActive(state);

// ============================================================================
// 5. DATA STORAGE
// ============================================================================

import { storage } from './storage/StorageService';

// Save activity
await storage.saveActivity({
  id: 'act-003',
  platform: 'youtube',
  activityType: 'watch',
  timestamp: new Date(),
  description: 'Watched gaming video',
  metadata: { duration: 25 },
  riskLevel: 'low'
});

// Retrieve activities (last 50)
const storedActivities = await storage.getActivities(50);

// Clean up old data
await storage.deleteActivities(30); // Delete older than 30 days

// ============================================================================
// 6. API COMMUNICATION
// ============================================================================

import { initializeApiClient } from './api/ParentDashboardApi';

// Initialize API client
const apiClient = initializeApiClient(
  'https://api.parentalcontrol.app',
  'child-device-001',
  'auth-token-xyz'
);

// Sync activities to parent dashboard
const syncResponse = await apiClient.syncActivities(activities);

// Notify parent of alerts
await apiClient.notifyAlerts(
  alerts.filter(a => !a.acknowledged),
  ['instagram', 'tiktok']
);

// Send health check
await apiClient.sendHealthCheck(
  deviceInfo?.healthCheck.batteryLevel ?? 0,
  deviceInfo?.healthCheck.storageSpace ?? 0,
  true
);

// Fetch dashboard data
const dashboard = await apiClient.fetchDashboardData(
  true,  // include activity history
  true,  // include alerts
  true,  // include device status
  24     // last 24 hours
);

// ============================================================================
// 7. REACT COMPONENT USAGE
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MonitoringScreen from './components/MonitoringScreen';
import DeviceControlScreen from './components/DeviceControlScreen';
import { monitoringSelectors, deviceSelectors } from './redux/selectors';

function AppComponent() {
  const dispatch = useDispatch();
  
  // Select state
  const activities = useSelector((state: any) => 
    monitoringSelectors.getAllActivities(state)
  );
  const alerts = useSelector((state: any) => 
    monitoringSelectors.getAllAlerts(state)
  );
  const schedules = useSelector((state: any) => 
    deviceSelectors.getAllSchedules(state)
  );

  // Event handlers
  const handleStartMonitoring = async () => {
    await monitoring.startMonitoring();
    dispatch(monitoringActions.setMonitoringActive(true));
  };

  const handleCreateSchedule = (schedule: any) => {
    const created = deviceControl.createSchedule(schedule);
    dispatch(deviceActions.createSchedule(created));
  };

  return (
    <div>
      <MonitoringScreen
        activities={activities}
        alerts={alerts}
        platformStats={monitoringSelectors.getPlatformStats(appStore.getState())}
        notificationLogs={[]}
        isMonitoring={true}
        onStartMonitoring={handleStartMonitoring}
        onStopMonitoring={() => monitoring.stopMonitoring()}
        onAcknowledgeAlert={(id) => monitoring.acknowledgeAlert(id)}
        selectedPlatform={null}
        onSelectPlatform={() => {}}
      />
      
      <DeviceControlScreen
        schedules={schedules}
        controlEvents={deviceSelectors.getControlEvents(appStore.getState())}
        countdownState={deviceSelectors.getCountdownState(appStore.getState())}
        deviceInfo={deviceSelectors.getDeviceInfo(appStore.getState())}
        onCreateSchedule={handleCreateSchedule}
        onUpdateSchedule={(id, updates) => {}}
        onDeleteSchedule={(id) => deviceControl.deleteSchedule(id)}
        onTriggerRemoteShutdown={async (action) => {
          await deviceControl.processRemoteRequest({
            deviceId: 'device-001',
            action,
            reason: 'remote',
            timestamp: new Date(),
            requestedBy: 'parent-001',
            requiresConfirmation: true,
            priority: 'normal'
          });
        }}
        onCancelCountdown={() => deviceControl.cancelCountdown()}
        onTriggerEmergencyOverride={() => deviceControl.triggerEmergencyOverride()}
      />
    </div>
  );
}

// ============================================================================
// 8. MOCK DATA & TESTING
// ============================================================================

import { MockDataGenerator, seedMockData } from './mock/MockDataGenerator';

// Generate mock data
const mockActivities = MockDataGenerator.generateActivities(20);
const mockAlerts = MockDataGenerator.generateAlerts(5);
const mockSchedules = MockDataGenerator.generateSchedules();
const mockEvents = MockDataGenerator.generateControlEvents(10);

// Seed into services
await seedMockData(monitoring, deviceControl, storage);

// ============================================================================
// 9. EVENT MONITORING & SUBSCRIPTION
// ============================================================================

// Subscribe to Redux state changes
const unsubscribe = appStore.subscribe(() => {
  const state = appStore.getState();
  console.log('State updated:', state);
  
  // Get specific data
  const alertCount = monitoringSelectors.getAlertCount(state);
  const isOnline = deviceSelectors.isDeviceOnline(state);
  
  if (alertCount > 0) {
    console.log(`⚠️ ${alertCount} alerts present`);
  }
  
  if (!isOnline) {
    console.log('🔴 Device offline');
  }
});

// Later, stop listening
// unsubscribe();

// ============================================================================
// 10. ERROR HANDLING
// ============================================================================

try {
  await monitoring.startMonitoring();
} catch (error) {
  console.error('Failed to start monitoring:', error);
  appStore.dispatch(monitoringActions.setMonitoringError(String(error)));
  
  // Access error state
  const state = appStore.getState();
  const monitoringError = state.error.monitoringError;
  if (monitoringError) {
    console.log('Current error:', monitoringError);
  }
}

// ============================================================================
// 11. FULL APPLICATION FLOW
// ============================================================================

async function runFullApplication() {
  console.log('Starting parental control app...\n');

  // 1. Initialize
  const app = new ParentalControlApp();
  await app.initialize();

  // 2. Demonstrate features
  await app.demonstrateMonitoring();
  await app.demonstrateDeviceControl();

  // 3. Export data
  const dashboard = await app.getState();
  console.log('App state:', dashboard);

  // 4. Cleanup
  await app.shutdown();
}

// Run the app
// runFullApplication().catch(console.error);

// ============================================================================
// 12. MANUAL TESTING SCENARIOS
// ============================================================================

async function testMonitoringPermissions() {
  const service = new SocialMediaMonitoringService();
  
  // Test permission request
  const granted = await service.requestPermission({
    platform: 'instagram',
    requiredScopes: ['activity_read'],
    reason: 'Monitor for safety'
  });
  
  console.assert(granted, 'Permission should be granted');
}

async function testDeviceShutdown() {
  const service = new DeviceControlService();
  
  // Create schedule
  const schedule = service.createSchedule({
    weekday: 1,
    hour: 22,
    minute: 0,
    enabled: true,
    recurring: true,
    timezone: 'UTC',
    gracePeriod: 5,
    emergencyOverrideEnabled: true
  });
  
  console.assert(schedule.id !== undefined, 'Schedule should have ID');
}

async function testDataSync() {
  const activities = MockDataGenerator.generateActivities(5);
  
  const response = await apiClient.syncActivities(activities);
  
  console.assert(response.success, 'Sync should succeed');
}

// ============================================================================
// End of Integration Guide
// ============================================================================

export { runFullApplication, testMonitoringPermissions, testDeviceShutdown, testDataSync };
