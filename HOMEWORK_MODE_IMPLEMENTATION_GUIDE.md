# Homework Mode Implementation Guide

## Quick Start

### 1. Installation & Setup

```bash
# No additional dependencies required - uses existing packages
# Database and Redux are already configured

# Start the app
npm run start
```

### 2. Initialize on App Startup

Add this to your `App.tsx` or main app initialization:

```typescript
import { homeworkModeDB } from '@/services/HomeworkModeDatabase';
import { homeworkModeService } from '@/services/HomeworkModeService';
import { homeworkModeDeviceController } from '@/services/HomeworkModeDeviceController';

useEffect(() => {
  const initializeHomeworkMode = async () => {
    try {
      // Initialize database
      await homeworkModeDB.initialize();

      // Register service callbacks
      homeworkModeService.registerCallbacks({
        onSessionStart: (session) => {
          console.log('Homework session started', session);
          // Update Redux, send notification
        },
        onSessionEnd: (session) => {
          console.log('Homework session ended', session);
        },
        onAppBlocked: (attempt) => {
          console.log('App blocked:', attempt.appName);
          // Show block screen to child
        },
      });

      console.log('Homework mode initialized');
    } catch (error) {
      console.error('Failed to initialize homework mode:', error);
    }
  };

  initializeHomeworkMode();
}, []);
```

### 3. Add HomeworkModeScreen to Navigation

```typescript
import HomeworkModeScreen from '@/screens/HomeworkModeScreen';

const Stack = createStackNavigator();

export function MainNavigator() {
  return (
    <Stack.Navigator>
      {/* Your other screens */}
      <Stack.Screen 
        name="HomeworkMode" 
        component={HomeworkModeScreen}
        options={{ title: 'Homework Mode' }}
      />
    </Stack.Navigator>
  );
}
```

### 4. Integrate App Launch Interception

In your app's permission/app launcher logic:

```typescript
import { homeworkModeDeviceController } from '@/services/HomeworkModeDeviceController';

async function launchApp(childId: string, packageName: string, appName: string) {
  // Check homework mode blocking
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

    // Display block screen with blockContent data
    return false; // Don't launch app
  }

  // App is allowed
  return true;
}
```

## File Structure

```
src/
├── components/
│   └── ScheduleEditor.tsx              # Schedule creation/editing modal
├── services/
│   ├── HomeworkModeService.ts          # Core homework mode logic
│   ├── HomeworkModeDatabase.ts         # SQLite database operations
│   └── HomeworkModeDeviceController.ts # Device integration layer
├── screens/
│   └── HomeworkModeScreen.tsx          # Main UI screen
├── store/
│   └── slices/
│       └── homeworkModeSlice.ts        # Redux state management
├── types/
│   └── index.ts                        # Type definitions (updated)
└── utils/
    └── mockHomeworkData.ts             # Test data
```

## Key Features Checklist

- [x] Schedule Management
  - [x] Create schedules with custom times
  - [x] Select days of week
  - [x] Enable/disable schedules
  - [x] Recurring schedules

- [x] Session Management
  - [x] Auto-start sessions based on schedule
  - [x] Track active sessions
  - [x] Auto-end sessions at scheduled time
  - [x] Manual session control

- [x] App Blocking
  - [x] Block pre-configured social apps
  - [x] Customizable block lists
  - [x] Real-time app launch interception
  - [x] Block attempt logging

- [x] Child Features
  - [x] View active session countdown
  - [x] Request break time (5-10 min)
  - [x] Request app access (notifies parent)
  - [x] View blocked apps list

- [x] Parent Features
  - [x] Create/edit schedules
  - [x] Real-time notifications on app attempts
  - [x] Approve/deny app access (30 sec window)
  - [x] Extend sessions
  - [x] Early termination
  - [x] View compliance reports

- [x] Analytics
  - [x] Session compliance tracking
  - [x] App attempt logging
  - [x] Blocked apps breakdown
  - [x] Weekly/monthly reports

- [x] Database
  - [x] SQLite integration
  - [x] Multi-table schema
  - [x] Data persistence
  - [x] Auto-cleanup old data

## Testing Scenarios

### Scenario 1: Basic Homework Session

**Setup:**
```typescript
// Create a schedule starting in 1 minute
const schedule = homeworkModeService.createSchedule('child_1', {
  name: 'Quick Test',
  startTime: new Date(Date.now() + 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  endTime: new Date(Date.now() + 300000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  daysOfWeek: [new Date().getDay()],
  enabled: true,
  childId: 'child_1',
});
```

**Steps:**
1. Open HomeworkModeScreen
2. Add the schedule
3. Wait 1 minute for auto-start
4. Verify "Homework Mode: ACTIVE" appears
5. Verify countdown timer starts

**Expected Results:**
- Session starts automatically
- Countdown timer updates every second
- "Request Break" button is enabled

---

### Scenario 2: App Blocking

**Setup:**
- Active homework session from Scenario 1

**Steps:**
1. Try to launch Instagram
2. Verify block screen appears
3. Click "Got It" to dismiss
4. Try to launch YouTube
5. Click "Request Access"

**Expected Results:**
- Block screen shows app name
- Block screen shows time remaining
- Block screen has dismiss and request buttons
- Recent attempts appear in "Recent Access Attempts" list

---

### Scenario 3: Break Request

**Setup:**
- Active homework session

**Steps:**
1. Click "Request Break (5-10 min)" button
2. Verify success message
3. Try clicking button again

**Expected Results:**
- Break time is recorded
- Button changes to "Break Already Taken"
- Break cannot be requested twice in same session

---

### Scenario 4: Parent Approval Flow

**Setup:**
- Two devices (parent & child)
- Active homework session on child device

**Steps:**
1. Child attempts to launch Instagram
2. Block screen appears on child device
3. Parent receives notification
4. Parent clicks "Approve"
5. Child can access Instagram temporarily
6. Timer expires after 10 minutes
7. App access is revoked

**Expected Results:**
- Parent receives notification immediately
- Approval takes 30 seconds or less
- Child can access app after approval
- Automatic revocation works

---

## Redux State Example

```typescript
// After homework session starts
{
  homeworkMode: {
    isActive: true,
    currentSession: {
      id: 'session_123',
      childId: 'child_1',
      scheduleId: 'schedule_1',
      startTime: 1699564800000,
      endTime: 1699579200000,
      status: 'active',
      blockedAppAttempts: [
        {
          id: 'attempt_1',
          appName: 'Instagram',
          timestamp: 1699568400000,
          parentResponse: 'denied',
        },
      ],
      breaksTaken: [],
      parentOverrides: [],
    },
    schedules: [
      {
        id: 'schedule_1',
        childId: 'child_1',
        name: 'Weekday Homework',
        startTime: '14:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        enabled: true,
        createdAt: 1699480800000,
        updatedAt: 1699564800000,
      },
    ],
    blockedApps: [
      { id: 'instagram', packageName: 'com.instagram.android', displayName: 'Instagram', category: 'social' },
      // ... other apps
    ],
    recentAttempts: [
      // Last 50 attempts across all sessions
    ],
    breakTimeAvailable: false,
    nextScheduleStart: 1699644000000,
    nextScheduleEnd: 1699657600000,
    loading: false,
    error: null,
    lastSync: 1699568400000,
  },
}
```

## Database Query Examples

```typescript
import { homeworkModeDB } from '@/services/HomeworkModeDatabase';

// Get child's schedules
const schedules = await homeworkModeDB.getSchedulesForChild('child_1');

// Get active session
const session = await homeworkModeDB.getActiveSession('child_1');

// Get session history (last 10)
const history = await homeworkModeDB.getSessionHistory('child_1', 10);

// Get recent attempts (last 30)
const attempts = await homeworkModeDB.getRecentAttempts(30);

// Get session's attempts
const sessionAttempts = await homeworkModeDB.getSessionAttempts('session_123');

// Get compliance report (last 7 days)
const report = await homeworkModeDB.getComplianceReport(
  'child_1',
  Date.now() - 7 * 24 * 60 * 60 * 1000,
  Date.now()
);

// Clean up old data
await homeworkModeDB.cleanupOldData();
```

## Common Integration Points

### 1. Permission System
```typescript
// Hook into permission checks
if (isHomeworkMode(childId)) {
  return !isBlockedApp(packageName);
}
```

### 2. Notification System
```typescript
// Send parent notification on app block
sendPushNotification('parent_1', {
  title: 'App Access Request',
  body: 'Your child requested access to Instagram',
  data: { type: 'app_request', attemptId: 'attempt_1' },
});
```

### 3. Analytics Dashboard
```typescript
// Display homework stats on parent dashboard
const analytics = await homeworkModeDeviceController.getHomeworkAnalytics(
  'child_1',
  7
);

// Show in parent dashboard
displayAnalytics(analytics);
```

### 4. Settings
```typescript
// Allow parents to customize
- Toggle homework mode on/off
- Add/remove apps from block list
- Modify schedule times
- Adjust break time duration
- Set notification preferences
```

## Debugging Tips

### Enable Logging
```typescript
// Add to services
const DEBUG = true;

if (DEBUG) {
  console.log('Homework Mode:', {
    isActive: isActive(),
    currentSession: getCurrentSession(),
    nextSchedule: getNextSchedule(),
  });
}
```

### Check Redux State
```typescript
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// In any component
const homeworkState = useSelector((state: RootState) => state.homeworkMode);
console.log('Homework State:', homeworkState);
```

### Verify Database
```typescript
// Check what's in database
async function debugDatabase() {
  const schedules = await homeworkModeDB.getSchedulesForChild('child_1');
  const sessions = await homeworkModeDB.getSessionHistory('child_1', 100);
  console.log('Schedules:', schedules);
  console.log('Sessions:', sessions);
}
```

## Performance Tips

1. **Lazy Load Analytics**: Only fetch analytics when viewing parent dashboard
2. **Batch Notifications**: Combine multiple updates into single Redux dispatch
3. **Cache Schedules**: Store schedules in Redux after first load
4. **Pagination**: Limit attempt history to last 50 items in memory
5. **Background Tasks**: Use expo-task-manager for schedule checks

## Rollout Checklist

- [ ] Database initialized on app start
- [ ] HomeworkModeScreen added to navigation
- [ ] App launcher integrated with HomeworkModeDeviceController
- [ ] Parent notification system connected
- [ ] Background schedule checker configured
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing on real device
- [ ] Parent dashboard displays analytics
- [ ] Child UI shows homework countdown
- [ ] Block screen displays correctly
- [ ] Database cleanup scheduled weekly
- [ ] Error handling and logging in place
- [ ] Documentation reviewed with team

---

**Next Steps:**
1. Follow Quick Start above
2. Run through Testing Scenarios
3. Integrate with your app's specific architecture
4. Test on real device
5. Gather user feedback
6. Iterate on design and features
