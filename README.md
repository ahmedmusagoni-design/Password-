# Parental Control App

A React Native (Expo) application for parental monitoring with screen time tracking and emergency SOS features.

## Features

### 1. Screen Time Tracking 📊
- Real-time app usage monitoring
- Daily, weekly, and historical analytics
- Category-based breakdowns (social, games, education, etc.)
- Local storage with SQLite
- Background sync with backend
- Usage alerts and notifications

### 2. SOS Emergency Feature 🆘
- Large, red emergency button
- 2-3 second hold-to-confirm mechanism
- Location sharing with parents
- Notification delivery with retry logic
- SOS history and log tracking
- Multi-platform support (iOS/Android)

### 3. Smart Alerts 🔔
- Screen time limit notifications
- Usage pattern analysis
- Customizable alert thresholds
- Quiet hours support

## Project Structure

```
src/
├── App.tsx                          # Main app component
├── components/
│   └── SOSButton.tsx               # Emergency SOS button component
├── screens/
│   ├── AuthScreen.tsx              # Login/authentication
│   ├── ScreenTimeOverviewScreen.tsx # Daily stats dashboard
│   ├── SOSHistoryScreen.tsx        # SOS alerts history
│   └── SettingsScreen.tsx          # App settings
├── services/
│   ├── ScreenTimeTrackerService.ts # App usage tracking logic
│   └── SOSAlertService.ts          # Emergency alert service
├── store/
│   ├── index.ts                    # Redux store configuration
│   └── slices/
│       ├── screenTimeSlice.ts      # Screen time state
│       ├── sosSlice.ts             # SOS state
│       ├── authSlice.ts            # Authentication state
│       └── appSlice.ts             # App-level state
├── navigation/
│   └── MainTabNavigator.tsx        # Bottom tab navigation
├── types/
│   └── index.ts                    # TypeScript type definitions
└── utils/
    ├── database.ts                 # SQLite database setup
    ├── helpers.ts                  # Utility functions
    ├── logger.ts                   # Logging utility
    └── mockData.ts                 # Mock data for testing
```

## Tech Stack

### Core
- **React Native** 0.73.0
- **Expo** 50.0.0
- **TypeScript** 5.3.0

### State Management
- **Redux Toolkit** 1.9.7
- **React-Redux** 8.1.3

### Navigation
- **React Navigation** 6.1.0
- **@react-navigation/bottom-tabs** 6.5.0

### Database
- **expo-sqlite** 13.0.0
- **React Native SQLite Storage** 6.0.0

### Services & APIs
- **Firebase** 10.7.0
- **expo-location** 16.0.0
- **expo-background-fetch** 12.0.0
- **expo-task-manager** 11.0.0

### UI
- **react-native-chart-kit** 6.12.0
- **react-native-gesture-handler** 2.14.0
- **react-native-reanimated** 3.5.0

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Expo CLI installed globally
- iOS/Android development environment (optional)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Firebase credentials and API endpoints

3. **Initialize database**
   The database is automatically initialized on first app launch.

### Development

Start the Expo development server:
```bash
npm start
```

Run on specific platform:
```bash
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser
```

## Core Services

### ScreenTimeTrackerService
Handles app usage tracking and data persistence:
- Polls active app every 5 seconds
- Records usage to SQLite
- Batch uploads to backend
- Background sync support

```typescript
// Start tracking
await screenTimeTrackerService.startTracking();

// Get today's usage
const apps = await screenTimeTrackerService.getTodayUsage();

// Get usage for date range
const weekUsage = await screenTimeTrackerService.getUsageForDateRange(
  startDate,
  endDate
);

// Upload to backend
const result = await screenTimeTrackerService.batchUploadData();
```

### SOSAlertService
Manages emergency alerts:
- Captures location data
- Sends notifications to parents
- Implements retry logic
- Maintains SOS history

```typescript
// Trigger SOS
const alert = await sosAlertService.triggerSOS('Emergency', childId);

// Get alert history
const alerts = await sosAlertService.getAllSOSAlerts();

// Retry failed alerts
await sosAlertService.retryFailedAlerts();
```

## Redux State Management

### Screen Time State
```typescript
{
  dailyStats: DailyScreenTime | null,
  weeklyStats: WeeklyStats | null,
  allTimeApps: AppUsageData[],
  loading: boolean,
  error: string | null,
  lastSync: number
}
```

### SOS State
```typescript
{
  alerts: SOSAlert[],
  history: SOSHistoryEntry[],
  isSOSActive: boolean,
  lastSOSTime: number | null,
  loading: boolean,
  error: string | null
}
```

### Auth State
```typescript
{
  userId: string | null,
  userType: 'parent' | 'child',
  isAuthenticated: boolean,
  loading: boolean,
  error: string | null
}
```

## Database Schema

### app_usage
- `id` (INTEGER PRIMARY KEY)
- `app_name` (TEXT)
- `package_name` (TEXT)
- `duration` (INTEGER)
- `timestamp` (INTEGER)
- `category` (TEXT)
- `date_str` (TEXT)
- `uploaded` (BOOLEAN)

### sos_alerts
- `id` (TEXT PRIMARY KEY)
- `child_id` (TEXT)
- `child_name` (TEXT)
- `timestamp` (INTEGER)
- `latitude`, `longitude`, `accuracy` (REAL)
- `reason` (TEXT)
- `status` (TEXT)
- `retry_count`, `max_retries` (INTEGER)

### sos_history
- `id` (TEXT PRIMARY KEY)
- `alert_id` (TEXT)
- `parent_notified` (BOOLEAN)
- `parent_response_time` (INTEGER)
- `notes` (TEXT)
- `created_at` (INTEGER)

## Testing

The app includes mock data for development:
- `generateMockDailyStats()` - Creates realistic daily usage data
- `generateMockWeeklyStats()` - Generates week-long statistics
- `generateMockSOSAlerts()` - Creates sample SOS alerts

## Configuration

### Environment Variables
```env
FIREBASE_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project
PARENT_API_URL=http://your-backend-url
MOCK_MODE=true  # Enable mock data
```

### Screen Time Limits
Configurable per child in `ChildConfig`:
```typescript
{
  screenTimeLimit: 2 * 60 * 60 * 1000,  // 2 hours
  alertThreshold: 80,                    // Alert at 80%
}
```

## API Integration

### Backend Endpoints (To be implemented)

**POST /api/screen-time/sync**
- Upload batch app usage data
- Returns: `{ uploadedCount, failedCount, nextSyncTime }`

**POST /api/sos/alert**
- Send SOS emergency alert
- Body: `{ childId, location, reason, timestamp }`
- Returns: `{ alertId, status, nextRetryTime }`

**GET /api/sos/history**
- Retrieve SOS alert history
- Returns: `{ alerts: SOSAlert[] }`

## Error Handling

- Comprehensive error logging via `logger` utility
- Retry logic with exponential backoff
- Offline support with local queuing
- User-friendly error messages

## Performance Considerations

- Efficient database queries with indexes
- Throttled app checking (5-second intervals)
- Batch data uploads to reduce network calls
- SQLite for local persistence
- Redux for optimal state management

## Security Notes

- Location data only collected for SOS alerts
- Sensitive data stored securely in device storage
- API calls should use HTTPS in production
- Firebase security rules needed for backend
- App permissions properly scoped

## Future Enhancements

- [ ] Machine learning for usage pattern analysis
- [ ] App blocking/scheduling features
- [ ] Web dashboard for parents
- [ ] Multi-device management
- [ ] Advanced analytics and reports
- [ ] Geofencing with alerts
- [ ] Screen time goals and gamification
- [ ] Parent-child messaging system
- [ ] Real device app usage tracking (native modules)
- [ ] Apple ScreenTime API integration
- [ ] Google Family Link integration

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit pull request

## License

MIT

## Support

For issues, questions, or feature requests, please create an issue in the repository.

## Changelog

### v0.1.0 (Initial Release)
- ✅ Project setup with TypeScript
- ✅ Screen time tracking service with local storage
- ✅ SOS emergency button with location sharing
- ✅ Daily/weekly usage analytics
- ✅ Redux state management
- ✅ Bottom tab navigation
- ✅ Settings and data management
- ✅ Mock data for development

## Author

Built with ❤️ for child safety and parental peace of mind.

---

**Note**: This is a development version using mock data. Production deployment requires:
- Backend API setup
- Firebase configuration
- Native module setup for real app usage tracking
- App store submission
- Privacy policy and terms of service
