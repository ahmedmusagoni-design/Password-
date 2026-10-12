# Setup Instructions

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy and edit the environment file:
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
npm start
```

### 4. Run on Device/Emulator
- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Web**: `npm run web`

## Project Features Implemented

### ✅ PROJECT SETUP (Step 1)
- [x] Expo project with TypeScript
- [x] Folder structure (src/components, screens, services, utils, types, navigation)
- [x] Core dependencies installed (React Navigation, Redux Toolkit, Firebase SDK)
- [x] Configuration files (package.json, app.json, tsconfig.json, .env)

### ✅ SCREEN TIME TRACKING (Step 2)
- [x] TypeScript types for device activity
- [x] Background service for app usage data collection
- [x] ScreenTimeTrackerService:
  - [x] Track active app every 5 seconds
  - [x] Store usage data in SQLite
  - [x] Batch upload to backend (mock implementation)
  - [x] Daily, weekly, and date-range queries
- [x] UI Screen:
  - [x] Daily usage stats display
  - [x] Total screen time summary
  - [x] Top 5 apps breakdown
  - [x] Usage alerts section
  - [x] Summary statistics

### ✅ SOS FEATURE (Step 3)
- [x] SOS button UI component
  - [x] Large red button
  - [x] Centered position
  - [x] Hold-to-confirm (2-3 seconds)
  - [x] Progress indicator
- [x] SOSAlertService:
  - [x] Send emergency notification to parents
  - [x] Include child's location
  - [x] Log timestamp and trigger reason
  - [x] Retry logic for failed delivery
- [x] SOS history log screen
  - [x] View past SOS alerts
  - [x] Status indicators (sent/failed/acknowledged)
  - [x] Location information display
  - [x] Timestamp and reason details

### ✅ INTEGRATION (Step 4)
- [x] Redux state management
  - [x] screenTimeSlice with daily/weekly stats
  - [x] sosSlice for alerts and history
  - [x] authSlice for user management
  - [x] appSlice for app-level state
- [x] Mock data for testing
  - [x] generateMockDailyStats()
  - [x] generateMockWeeklyStats()
  - [x] generateMockSOSAlerts()
- [x] Basic error handling and logging
  - [x] Logger utility with debug/info/warn/error levels
  - [x] Try-catch error handling in services
  - [x] Redux error state management

## Architecture Overview

```
App (Redux Provider + Navigation)
├── AuthScreen (Login selection)
├── MainTabNavigator
│   ├── ScreenTimeOverviewScreen (Daily stats dashboard)
│   ├── SOSButton (Emergency button)
│   ├── SOSHistoryScreen (Alert history)
│   └── SettingsScreen (App config)
├── Services
│   ├── ScreenTimeTrackerService (Usage tracking)
│   └── SOSAlertService (Emergency alerts)
└── Redux Store
    ├── screenTimeSlice
    ├── sosSlice
    ├── authSlice
    └── appSlice
```

## Database Tables

1. **app_usage** - Individual app usage records
2. **daily_stats** - Cached daily statistics
3. **sos_alerts** - Emergency alert records
4. **sos_history** - SOS response tracking
5. **sync_queue** - Failed uploads for retry

## Usage Examples

### Start tracking screen time
```typescript
import { screenTimeTrackerService } from './src/services/ScreenTimeTrackerService';

await screenTimeTrackerService.initialize();
await screenTimeTrackerService.startTracking();
```

### Trigger SOS alert
```typescript
import { sosAlertService } from './src/services/SOSAlertService';

const alert = await sosAlertService.triggerSOS('Emergency - Lost');
```

### Get daily stats from Redux
```typescript
import { useAppSelector } from './src/store';

const { dailyStats } = useAppSelector(state => state.screenTime);
```

## Mock Data Features

The app includes realistic mock data for development:
- 8 sample apps (TikTok, Instagram, YouTube, Discord, Roblox, Minecraft, Khan Academy, Duolingo)
- Random usage durations per app (5-120 minutes)
- Category-based organization (social, games, education, video)
- Sample alerts and notifications
- Simulated SOS alerts with locations

## Testing Checklist

- [ ] App launches without errors
- [ ] Screen time data displays correctly
- [ ] Top apps list shows accurate usage
- [ ] SOS button responds to hold gesture
- [ ] SOS alert saves to history
- [ ] Settings page loads all options
- [ ] Logout clears authentication
- [ ] Clear data deletes all records
- [ ] Navigation between tabs works smoothly

## Development Notes

1. **Mock Mode**: Currently using `MOCK_MODE=true` in .env
2. **Location Permissions**: Required for SOS feature, handled on initialize
3. **Background Tasks**: Registered but not fully running in dev mode
4. **Database**: Auto-initialized on app start
5. **Navigation**: Redux state drives auth/main app switching

## Next Steps for Production

1. **Backend API**: Implement actual endpoints for:
   - App usage data sync
   - SOS alert delivery
   - User authentication
   - Parent notifications

2. **Native Integration**: Use:
   - Android: UsageStatsManager for real app tracking
   - iOS: DeviceActivityScheduler (iOS 15+) or custom implementation

3. **Notifications**: Setup Firebase Cloud Messaging for:
   - Push notifications to parents
   - Alert delivery confirmation

4. **Security**: Implement:
   - OAuth/JWT authentication
   - HTTPS endpoints
   - Encrypted data storage
   - SSL certificate pinning

5. **Testing**: Add:
   - Unit tests for services
   - Integration tests for Redux
   - E2E tests with Detox
   - Performance monitoring

## Troubleshooting

**"expo-sqlite not found"**: Make sure all dependencies are installed with `npm install`

**"Database initialization failed"**: Check that the database directory has write permissions

**"Location permission denied"**: On Android, runtime permissions must be requested; on iOS, check Info.plist

**"Background task not running"**: In development, this requires native build; use `expo prebuild` first

## Support & Documentation

- [React Native Docs](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Redux Toolkit Guide](https://redux-toolkit.js.org/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
