# Parental Control App - Social Media Monitoring & Device Control

A comprehensive TypeScript-based parental control application with social media monitoring and device shutdown control features.

## Features

### 1. Social Media Monitoring
- **Multi-Platform Support**: Instagram, TikTok, Snapchat, Twitter/X, YouTube
- **Activity Tracking**: Chronological feed of social media activities
- **Platform Statistics**: Time spent, engagement metrics, follower changes
- **Risk Detection**: Keyword-based alerting system for concerning content
- **Permission System**: Request and manage device permissions per platform
- **Notification System**: Parent alerts with delivery status tracking
- **Data Privacy**: Only metadata stored, no actual messages/content

### 2. Device Shutdown Control
- **Shutdown Scheduling**: Set device shutdown times with recurring options
- **Remote Trigger**: Parent app can remotely trigger shutdown/restart/lock
- **Graceful Shutdown**: Countdown timer with configurable grace period
- **Emergency Override**: Allow SOS to bypass scheduled shutdown
- **Bypass Protection**: Detect and log attempted uninstall/disable attempts
- **Health Monitoring**: Periodic checks for device status, battery, storage
- **Event Logging**: Complete history of all shutdown/control events

## Architecture

```
src/
├── types/          # TypeScript type definitions
├── services/       # Business logic services
│   ├── SocialMediaMonitoringService.ts
│   └── DeviceControlService.ts
├── redux/          # State management
│   ├── actions.ts
│   ├── reducers.ts
│   ├── selectors.ts
│   └── store.ts
├── storage/        # Data persistence
│   └── StorageService.ts
├── api/            # Backend communication
│   └── ParentDashboardApi.ts
├── components/     # UI components (React)
│   ├── MonitoringScreen.tsx
│   └── DeviceControlScreen.tsx
├── mock/           # Test data
│   └── MockDataGenerator.ts
└── index.ts        # Application entry point
```

## Type System

### Social Media Activity
```typescript
interface SocialMediaActivity {
  id: string;
  platform: SocialMediaPlatform;
  activityType: ActivityType;
  username?: string;
  timestamp: Date;
  description: string;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  keywords?: string[];
  duration?: number;
}
```

### Device Control Event
```typescript
interface DeviceControlEvent {
  id: string;
  action: DeviceControlAction;
  reason: ShutdownReason;
  timestamp: Date;
  initiatedBy: 'parent' | 'schedule' | 'system';
  scheduled: boolean;
  completedAt?: Date;
  success: boolean;
}
```

## Redux State Management

### Monitoring State
- Activities feed
- Platform statistics
- Alerts with risk levels
- Permissions status
- Notification logs
- Sync timestamps

### Device Control State
- Shutdown schedules
- Control events history
- Active countdown state
- Device health information
- Pending remote requests

## Storage

Uses SQLite-based local storage for offline capability with support for:
- Activity persistence
- Alert storage
- Schedule management
- Event logging
- Data encryption

## API Integration

### Parent Dashboard Communication
- **Activity Sync**: Upload monitoring data periodically
- **Alert Notification**: Notify parents of risky activities
- **Schedule Sync**: Push schedule updates from parent
- **Health Checks**: Regular device status reporting
- **Remote Control**: Receive shutdown requests from parent

### API Endpoints
- `POST /sync/activities` - Sync monitoring activities
- `POST /alerts/notify` - Notify parent of alerts
- `POST /alerts/acknowledge` - Acknowledge alert actions
- `POST /schedules/sync` - Sync shutdown schedules
- `POST /device/control` - Process remote shutdown
- `POST /device/events/log` - Upload control events
- `POST /health/check` - Send health check
- `POST /dashboard/data` - Fetch complete dashboard data

## Usage

### Basic Setup
```typescript
import { ParentalControlApp } from './index';

const app = new ParentalControlApp(
  'https://api.parentalcontrol.app',
  'device-001'
);

await app.initialize();
```

### Monitoring Example
```typescript
// Get monitoring service
const monitoring = monitoringService;

// Start monitoring
await monitoring.startMonitoring();

// Get activities
const activities = monitoring.getActivities();

// Get alerts
const alerts = monitoring.getAlerts();
```

### Device Control Example
```typescript
// Get device control service
const deviceControl = deviceControlService;

// Create shutdown schedule
const schedule = deviceControl.createSchedule({
  weekday: 1, // Monday
  hour: 22,
  minute: 0,
  enabled: true,
  recurring: true,
  timezone: 'UTC',
  gracePeriod: 5,
  emergencyOverrideEnabled: true
});

// Process remote shutdown request
await deviceControl.processRemoteRequest({
  deviceId: 'device-001',
  action: 'shutdown',
  reason: 'bedtime',
  timestamp: new Date(),
  requestedBy: 'parent-001',
  requiresConfirmation: true,
  priority: 'normal'
});
```

### Redux Integration
```typescript
import { appStore } from './redux/store';
import { monitoringSelectors, deviceSelectors } from './redux/selectors';

const state = appStore.getState();

// Get monitoring data
const alerts = monitoringSelectors.getAllAlerts(state);
const stats = monitoringSelectors.getPlatformStats(state);

// Get device control data
const schedules = deviceSelectors.getAllSchedules(state);
const deviceInfo = deviceSelectors.getDeviceInfo(state);
```

## Mock Data

Generate realistic test data:
```typescript
import { MockDataGenerator } from './mock/MockDataGenerator';

// Generate individual datasets
const activities = MockDataGenerator.generateActivities(20);
const alerts = MockDataGenerator.generateAlerts(5);
const schedules = MockDataGenerator.generateSchedules();

// Generate complete app state
const mockState = MockDataGenerator.generateMockAppState();
```

## Testing

Run the demonstration:
```bash
npm install
npm run build
npm start
```

This will:
1. Initialize the app with services
2. Seed mock data
3. Demonstrate monitoring features
4. Demonstrate device control features
5. Export dashboard data
6. Show current app status

## Error Handling

All services include comprehensive error handling:
- Try-catch blocks for async operations
- Redux error state for UI feedback
- Console logging for debugging
- Graceful fallbacks for permission denials

## Logging

Detailed logging throughout:
- Service initialization
- Activity monitoring events
- Schedule management
- Device control actions
- API communication
- Error conditions

## Privacy & Security

- **No Content Storage**: Only metadata stored, actual messages/content excluded
- **Local Encryption**: Sensitive data encrypted locally
- **Permission-Based**: Only accesses platforms with explicit permission
- **Secure API**: HTTPS communication with bearer token auth
- **Data Cleanup**: Automatic deletion of old data

## Component UI Structure

### Monitoring Screen
- Control panel (Start/Stop monitoring, filter by platform)
- Alerts dashboard (High/medium risk alerts with keywords)
- Platform statistics (Time spent, activities, risk counts)
- Activity feed (Chronological list with risk indicators)

### Device Control Screen
- Schedule editor (Create new shutdown schedules)
- Schedule list (Manage active schedules)
- Countdown display (Active shutdown timer)
- Device control panel (Remote shutdown/restart/lock)
- Control history (Event log)

## Future Enhancements

- Native iOS/Android integration
- Real social media API integration
- Advanced ML-based risk detection
- Parent app two-factor authentication
- End-to-end encrypted messaging
- Multi-device coordination
- Cloud backup of monitoring data

## Dependencies

- Redux: State management
- TypeScript: Type safety
- SQLite: Local data storage
- Axios: HTTP client (optional, for real API calls)
- React: UI components (optional)

## License

Proprietary - Parental Control App

## Support

For issues or questions, contact support@parentalcontrol.app
