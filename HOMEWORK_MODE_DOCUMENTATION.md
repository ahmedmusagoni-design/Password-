# Homework Mode Feature Documentation

## Overview

The Homework Mode feature enables parents to set scheduled time periods during which social media and entertainment apps are blocked on their child's device. The feature includes automatic scheduling, app blocking enforcement, break time management, and comprehensive parent notifications.

## Features

### 1. Schedule Management
- Create multiple homework schedules with custom times and days
- Recurring schedules (e.g., weekday homework from 2-6 PM)
- Enable/disable schedules without deleting them
- Automatic session activation based on schedule

### 2. App Blocking
- Pre-configured blocked apps: Instagram, TikTok, Snapchat, YouTube, Facebook
- Customizable app blocking lists
- Real-time app launch interception
- Non-intrusive block screen with helpful messaging

### 3. Break Time Management
- Child can request 5-10 minute breaks during homework
- One break per session (configurable)
- Break time is tracked and logged
- Parent can override break restrictions if needed

### 4. Parent Controls
- Real-time notifications when child attempts blocked apps
- 30-second decision window to approve/deny access
- Session extension/shortening controls
- Temporary app access override capabilities
- Emergency early session termination

### 5. Analytics & Reporting
- Daily homework compliance tracking
- Access attempt logging and analysis
- Most frequently blocked apps report
- Session completion statistics
- Detailed compliance analytics

## Technical Architecture

### Core Components

#### 1. **HomeworkModeService** (`src/services/HomeworkModeService.ts`)
Main service handling all homework mode logic:
- Schedule management (CRUD operations)
- Session lifecycle management (start, end, extend)
- App launch interception and logging
- Break time handling
- Parent override processing
- Next scheduled time calculations

```typescript
// Example usage
const schedule = homeworkModeService.createSchedule('child_1', {
  name: 'Weekday Homework',
  startTime: '14:00',
  endTime: '18:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  enabled: true,
  childId: 'child_1',
});

// Check if app should be blocked
const isBlocked = homeworkModeService.handleAppLaunchAttempt(
  'child_1',
  'com.instagram.android',
  'Instagram'
);
```

#### 2. **HomeworkModeDatabase** (`src/services/HomeworkModeDatabase.ts`)
SQLite database service for persistent storage:
- Tables: `homework_schedules`, `homework_sessions`, `blocked_app_attempts`, `break_time_log`
- CRUD operations for all entities
- Compliance reporting queries
- Automatic data cleanup (30-day retention)

```typescript
// Example usage
await homeworkModeDB.initialize();
await homeworkModeDB.saveSchedule(schedule);
const attempts = await homeworkModeDB.getRecentAttempts(50);
```

#### 3. **HomeworkModeDeviceController** (`src/services/HomeworkModeDeviceController.ts`)
Integration layer between homework mode and device control:
- App launch interception
- Block screen content generation
- Parent response processing
- Status and analytics queries
- Provides interface for DeviceControlService integration

```typescript
// Example usage
const shouldBlock = await homeworkModeDeviceController.onAppLaunchAttempted(
  'child_1',
  'com.instagram.android',
  'Instagram'
);

const blockContent = homeworkModeDeviceController.getBlockScreenContent(
  'Instagram',
  'Alex',
  3600000 // 1 hour remaining
);
```

#### 4. **Redux State Management** (`src/store/slices/homeworkModeSlice.ts`)
Redux slice for component state:
- Schedules and active sessions
- Recent app attempts
- Break time availability
- Loading and error states

```typescript
import { setActiveSession, recordAppAttempt } from '@/store/slices/homeworkModeSlice';

dispatch(setActiveSession(session));
dispatch(recordAppAttempt(attempt));
```

### UI Components

#### 1. **HomeworkModeScreen** (`src/screens/HomeworkModeScreen.tsx`)
Main screen for homework mode management:
- Active session status display with countdown timer
- Schedule list with CRUD operations
- Blocked apps grid
- Recent access attempts log
- Break time request button

#### 2. **ScheduleEditor** (`src/components/ScheduleEditor.tsx`)
Modal component for creating/editing schedules:
- Time picker for start/end times
- Day of week selector
- Schedule name input
- Enable/disable toggle
- Visual validation and confirmation

## Database Schema

### homework_schedules
```sql
CREATE TABLE homework_schedules (
  id TEXT PRIMARY KEY,
  childId TEXT NOT NULL,
  name TEXT NOT NULL,
  startTime TEXT NOT NULL,         -- HH:mm format
  endTime TEXT NOT NULL,            -- HH:mm format
  daysOfWeek TEXT NOT NULL,        -- JSON array [0-6]
  enabled INTEGER NOT NULL,        -- 0 or 1
  createdAt INTEGER NOT NULL,      -- Unix timestamp
  updatedAt INTEGER NOT NULL       -- Unix timestamp
);
```

### homework_sessions
```sql
CREATE TABLE homework_sessions (
  id TEXT PRIMARY KEY,
  childId TEXT NOT NULL,
  scheduleId TEXT NOT NULL,
  startTime INTEGER NOT NULL,      -- Unix timestamp
  endTime INTEGER NOT NULL,        -- Unix timestamp
  status TEXT NOT NULL,            -- 'active', 'completed', 'cancelled'
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### blocked_app_attempts
```sql
CREATE TABLE blocked_app_attempts (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  appId TEXT NOT NULL,             -- Package name
  appName TEXT NOT NULL,
  timestamp INTEGER NOT NULL,      -- Unix timestamp
  parentNotified INTEGER NOT NULL, -- 0 or 1
  parentResponse TEXT,             -- 'approved', 'denied', or NULL
  responseTime INTEGER,            -- milliseconds to respond
  createdAt INTEGER NOT NULL
);
```

### break_time_log
```sql
CREATE TABLE break_time_log (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  startTime INTEGER NOT NULL,      -- Unix timestamp
  endTime INTEGER NOT NULL,
  duration INTEGER NOT NULL,       -- milliseconds
  requestedByChild INTEGER NOT NULL,  -- 0 or 1
  createdAt INTEGER NOT NULL
);
```

## Integration Guide

### 1. Initialize Homework Mode

```typescript
import { homeworkModeService } from '@/services/HomeworkModeService';
import { homeworkModeDB } from '@/services/HomeworkModeDatabase';

// Initialize database on app start
await homeworkModeDB.initialize();

// Register service callbacks
homeworkModeService.registerCallbacks({
  onSessionStart: (session) => {
    // Handle session start (update Redux, trigger notification)
  },
  onSessionEnd: (session) => {
    // Handle session end (update Redux)
  },
  onAppBlocked: (attempt) => {
    // Show block notification to child
  },
  onParentNotificationNeeded: (attempt) => {
    // Send push notification to parent
  },
});
```

### 2. Hook Into App Launcher

In your `DeviceControlService`:

```typescript
import { homeworkModeDeviceController } from '@/services/HomeworkModeDeviceController';

async function onAppLaunchAttempted(childId, packageName, appName) {
  const shouldBlock = await homeworkModeDeviceController.onAppLaunchAttempted(
    childId,
    packageName,
    appName
  );

  if (shouldBlock) {
    const status = await homeworkModeDeviceController.getHomeworkStatus(childId);
    const blockContent = homeworkModeDeviceController.getBlockScreenContent(
      appName,
      childName,
      status.timeRemaining
    );
    
    // Display block screen to user
    showBlockScreen(blockContent);
    return false; // Prevent app launch
  }
  
  return true; // Allow app launch
}
```

### 3. Periodic Schedule Check

Set up a background task to check for scheduled homework sessions:

```typescript
import * as TaskManager from 'expo-task-manager';
import { homeworkModeService } from '@/services/HomeworkModeService';

TaskManager.defineTask('HOMEWORK_CHECK', async () => {
  const children = await getChildrenList(); // Your implementation
  
  for (const child of children) {
    const session = homeworkModeService.checkAndStartScheduledSessions(child.id);
    if (session) {
      // Notify child about homework start
    }
  }
});

// Register background task
await TaskManager.registerTaskAsync('HOMEWORK_CHECK', {
  minimumInterval: 60, // Check every minute
});
```

## Mock Data

Comprehensive mock data is provided in `src/utils/mockHomeworkData.ts`:

```typescript
import {
  mockSchedules,
  createMockSessions,
  mockBlockedAppAttempts,
  generateMockAttempt,
  mockComplianceReport,
} from '@/utils/mockHomeworkData';

// Use for testing and development
const schedules = mockSchedules;
const sessions = createMockSessions();
const attempts = mockBlockedAppAttempts;
const report = mockComplianceReport;
```

## Usage Examples

### Create a Homework Schedule

```typescript
const schedule = homeworkModeService.createSchedule('child_1', {
  name: 'Weekday Homework',
  startTime: '14:00',
  endTime: '18:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  enabled: true,
  childId: 'child_1',
});

await homeworkModeDB.saveSchedule(schedule);
dispatch(addSchedule(schedule));
```

### Handle App Block Attempt

```typescript
const isBlocked = homeworkModeService.handleAppLaunchAttempt(
  'child_1',
  'com.instagram.android',
  'Instagram'
);

if (isBlocked) {
  const session = homeworkModeService.getActiveSession('child_1');
  dispatch(recordAppAttempt(session.blockedAppAttempts[0]));
  
  // Show block screen with request button
}
```

### Request Break Time

```typescript
try {
  const breakTime = homeworkModeService.requestBreakTime('child_1', 5 * 60 * 1000);
  dispatch(setBreakTimeAvailable(false));
  
  // Record in database
  await homeworkModeDB.recordBreakTime(breakTime);
} catch (error) {
  console.error('Break request failed:', error);
}
```

### Parent Response to App Request

```typescript
await homeworkModeDeviceController.processParentResponse(
  'attempt_1',
  true, // approved
  10 * 60 * 1000 // 10 minute access duration
);

// Update Redux
dispatch(updateAppAttempt({
  attemptId: 'attempt_1',
  parentResponse: 'approved',
  responseTime: 2500,
}));
```

### Get Homework Analytics

```typescript
const analytics = await homeworkModeDeviceController.getHomeworkAnalytics(
  'child_1',
  7 // last 7 days
);

// Returns:
{
  period: { startDate, endDate },
  compliance: {
    totalSessions: 15,
    completedSessions: 14,
    completionRate: 93.3,
  },
  appAttempts: {
    total: 28,
    blocked: 22,
    approved: 6,
    approvalRate: 21.4,
  },
  mostBlockedApp: 'Instagram',
  blockedAppsBreakdown: {
    'Instagram': 8,
    'TikTok': 7,
    'YouTube': 5,
  },
}
```

## Testing Instructions

### Unit Testing

```typescript
import { homeworkModeService } from '@/services/HomeworkModeService';

describe('HomeworkModeService', () => {
  it('should create a schedule', () => {
    const schedule = homeworkModeService.createSchedule('child_1', {
      name: 'Test',
      startTime: '14:00',
      endTime: '18:00',
      daysOfWeek: [1],
      enabled: true,
      childId: 'child_1',
    });

    expect(schedule.id).toBeDefined();
    expect(schedule.name).toBe('Test');
  });

  it('should block app during homework', () => {
    // Start a session
    const session = homeworkModeService.startSession('child_1', 'schedule_1');
    
    // Attempt to launch blocked app
    const isBlocked = homeworkModeService.handleAppLaunchAttempt(
      'child_1',
      'com.instagram.android',
      'Instagram'
    );
    
    expect(isBlocked).toBe(true);
  });
});
```

### Integration Testing

1. Create a schedule with mock data
2. Start a session manually
3. Attempt to launch a blocked app
4. Verify block screen appears
5. Check database records
6. Verify parent notification
7. Simulate parent approval
8. Verify child can access app temporarily

### Manual Testing Steps

1. **Create Schedule**
   - Open HomeworkModeScreen
   - Click "Add Schedule"
   - Set name to "Test Homework"
   - Set time to current time + 1 minute
   - Select all days of week
   - Save

2. **Test App Blocking**
   - Wait for session to auto-start
   - Verify "Homework Mode: ACTIVE" appears
   - Try to launch Instagram
   - Verify block screen with "Got It" and "Request Access" buttons

3. **Test Break Request**
   - Click "Request Break (5-10 min)" button
   - Verify break time recorded
   - Button changes to "Break Already Taken"

4. **Test Parent Notifications**
   - Set up two devices (parent & child)
   - Child attempts blocked app
   - Parent receives notification
   - Parent clicks "Approve"
   - Child can temporarily access app

## Performance Considerations

- **Schedule Checks**: Run every 60 seconds for reasonable battery impact
- **Database Cleanup**: Run weekly to remove data older than 30 days
- **Attempt Logging**: Limit in-memory attempt log to last 50 items
- **Session Timers**: Auto-cleanup completed sessions

## Security Considerations

- Parent response window limited to 30 seconds to prevent timing attacks
- All timestamps use Unix milliseconds for consistent timezone handling
- Database operations use prepared statements to prevent SQL injection
- Override operations require parent ID verification
- Session data encrypted in transit when syncing to cloud

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const session = homeworkModeService.startSession(childId, scheduleId);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      // Handle not found
    }
  }
  dispatch(setError(error.message));
}
```

## Future Enhancements

1. **Cloud Sync**: Sync schedules and sessions to cloud
2. **Whitelist Apps**: Allow educational apps during homework
3. **Custom Block Reasons**: Let parents customize block messages
4. **Geofencing**: Auto-start homework when child arrives home
5. **AI Analytics**: Suggest optimal homework times based on behavior
6. **Emergency Override**: Quick parent access for urgent needs
7. **Reward System**: Gamify homework completion with rewards
8. **Teacher Integration**: Sync with school homework assignments

## Troubleshooting

### Session Not Starting
- Check schedule is enabled
- Verify current day is in daysOfWeek array
- Ensure startTime/endTime format is correct (HH:mm)

### App Not Being Blocked
- Verify session is active (check Redux state)
- Check app packageName matches blocked apps list
- Ensure app launch is going through interceptor

### Parent Notifications Not Received
- Verify notification callbacks registered
- Check parent has notifications enabled
- Review notification service integration

### Database Errors
- Call `await homeworkModeDB.initialize()` before operations
- Check database permissions on device
- Review SQLite error logs

---

**Version**: 1.0.0
**Last Updated**: 2024
**Maintainer**: Parental Control App Team
