/**
 * Mock Data for Homework Mode Feature
 * Provides realistic test data for development and testing
 */

import {
  HomeworkSchedule,
  HomeworkSession,
  BlockedAppAttempt,
  BreakTime,
} from '@/types';

/**
 * Mock Homework Schedules
 */
export const mockSchedules: HomeworkSchedule[] = [
  {
    id: 'schedule_1',
    childId: 'child_1',
    name: 'Weekday Homework',
    startTime: '14:00',
    endTime: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    enabled: true,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  {
    id: 'schedule_2',
    childId: 'child_1',
    name: 'Evening Study',
    startTime: '19:00',
    endTime: '21:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
    enabled: true,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  {
    id: 'schedule_3',
    childId: 'child_2',
    name: 'After School Focus',
    startTime: '15:30',
    endTime: '17:30',
    daysOfWeek: [1, 2, 3, 4], // Monday to Thursday
    enabled: true,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
];

/**
 * Mock Homework Sessions
 */
export const createMockSessions = (): HomeworkSession[] => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  const yesterday = now - 24 * 60 * 60 * 1000;

  return [
    {
      id: 'session_1',
      childId: 'child_1',
      scheduleId: 'schedule_1',
      startTime: yesterday + 14 * 60 * 60 * 1000,
      endTime: yesterday + 18 * 60 * 60 * 1000,
      status: 'completed',
      blockedAppAttempts: [
        {
          id: 'attempt_1',
          sessionId: 'session_1',
          appId: 'com.instagram.android',
          appName: 'Instagram',
          timestamp: yesterday + 14.5 * 60 * 60 * 1000,
          parentNotified: true,
          parentResponse: 'denied',
          responseTime: 2500,
        },
        {
          id: 'attempt_2',
          sessionId: 'session_1',
          appId: 'com.zhiliaoapp.musically',
          appName: 'TikTok',
          timestamp: yesterday + 15.2 * 60 * 60 * 1000,
          parentNotified: true,
          parentResponse: 'approved',
          responseTime: 1800,
        },
      ],
      breaksTaken: [
        {
          id: 'break_1',
          sessionId: 'session_1',
          startTime: yesterday + 15.5 * 60 * 60 * 1000,
          endTime: yesterday + 16 * 60 * 60 * 1000,
          duration: 5 * 60 * 1000,
          requestedByChild: true,
        },
      ],
      parentOverrides: [],
    },
    {
      id: 'session_2',
      childId: 'child_1',
      scheduleId: 'schedule_1',
      startTime: now - 4 * 60 * 60 * 1000,
      endTime: now - 100 * 1000, // Ending soon
      status: 'active',
      blockedAppAttempts: [
        {
          id: 'attempt_3',
          sessionId: 'session_2',
          appId: 'com.facebook.katana',
          appName: 'Facebook',
          timestamp: now - 1.5 * 60 * 60 * 1000,
          parentNotified: true,
          parentResponse: undefined,
          responseTime: undefined,
        },
        {
          id: 'attempt_4',
          sessionId: 'session_2',
          appId: 'com.google.android.youtube',
          appName: 'YouTube',
          timestamp: now - 30 * 60 * 1000,
          parentNotified: false,
          parentResponse: undefined,
          responseTime: undefined,
        },
      ],
      breaksTaken: [],
      parentOverrides: [],
    },
    {
      id: 'session_3',
      childId: 'child_2',
      scheduleId: 'schedule_3',
      startTime: yesterday + 15.5 * 60 * 60 * 1000,
      endTime: yesterday + 17.5 * 60 * 60 * 1000,
      status: 'completed',
      blockedAppAttempts: [
        {
          id: 'attempt_5',
          sessionId: 'session_3',
          appId: 'com.snapchat.android',
          appName: 'Snapchat',
          timestamp: yesterday + 16 * 60 * 60 * 1000,
          parentNotified: true,
          parentResponse: 'denied',
          responseTime: 3200,
        },
      ],
      breaksTaken: [
        {
          id: 'break_2',
          sessionId: 'session_3',
          startTime: yesterday + 16.5 * 60 * 60 * 1000,
          endTime: yesterday + 16.583 * 60 * 60 * 1000, // ~35 minutes
          duration: 5 * 60 * 1000 + 30 * 1000,
          requestedByChild: true,
        },
      ],
      parentOverrides: [
        {
          id: 'override_1',
          sessionId: 'session_3',
          timestamp: yesterday + 17 * 60 * 60 * 1000,
          type: 'extend_session',
          reason: 'Child needs more time to finish assignment',
          createdBy: 'parent_1',
        },
      ],
    },
  ];
};

/**
 * Mock Blocked App Attempts
 */
export const mockBlockedAppAttempts: BlockedAppAttempt[] = [
  {
    id: 'attempt_recent_1',
    sessionId: 'session_2',
    appId: 'com.instagram.android',
    appName: 'Instagram',
    timestamp: Date.now() - 5 * 60 * 1000,
    parentNotified: true,
    parentResponse: 'denied',
    responseTime: 3000,
  },
  {
    id: 'attempt_recent_2',
    sessionId: 'session_2',
    appId: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    timestamp: Date.now() - 15 * 60 * 1000,
    parentNotified: true,
    parentResponse: undefined,
    responseTime: undefined,
  },
  {
    id: 'attempt_recent_3',
    sessionId: 'session_2',
    appId: 'com.facebook.katana',
    appName: 'Facebook',
    timestamp: Date.now() - 25 * 60 * 1000,
    parentNotified: false,
    parentResponse: undefined,
    responseTime: undefined,
  },
  {
    id: 'attempt_recent_4',
    sessionId: 'session_2',
    appId: 'com.snapchat.android',
    appName: 'Snapchat',
    timestamp: Date.now() - 45 * 60 * 1000,
    parentNotified: true,
    parentResponse: 'approved',
    responseTime: 1500,
  },
  {
    id: 'attempt_recent_5',
    sessionId: 'session_2',
    appId: 'com.google.android.youtube',
    appName: 'YouTube',
    timestamp: Date.now() - 60 * 60 * 1000,
    parentNotified: true,
    parentResponse: 'denied',
    responseTime: 2200,
  },
];

/**
 * Mock break times
 */
export const mockBreakTimes: BreakTime[] = [
  {
    id: 'break_mock_1',
    sessionId: 'session_1',
    startTime: Date.now() - 2 * 60 * 60 * 1000,
    endTime: Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000,
    duration: 5 * 60 * 1000,
    requestedByChild: true,
  },
  {
    id: 'break_mock_2',
    sessionId: 'session_2',
    startTime: Date.now() - 30 * 60 * 1000,
    endTime: Date.now() - 30 * 60 * 1000 + 8 * 60 * 1000,
    duration: 8 * 60 * 1000,
    requestedByChild: true,
  },
];

/**
 * Mock notification payloads
 */
export const mockNotifications = {
  appBlocked: {
    title: 'App Blocked',
    body: 'Instagram is blocked during homework time',
    data: {
      type: 'app_blocked',
      appName: 'Instagram',
      sessionId: 'session_2',
      attemptId: 'attempt_recent_1',
    },
  },
  sessionStarting: {
    title: 'Homework Time',
    body: 'Your homework session is starting. Apps will be blocked for focus.',
    data: {
      type: 'session_start',
      sessionId: 'session_2',
      startTime: Date.now(),
      endTime: Date.now() + 4 * 60 * 60 * 1000,
    },
  },
  sessionEnded: {
    title: 'Homework Complete',
    body: 'Your homework session has ended. You can now access all apps.',
    data: {
      type: 'session_end',
      sessionId: 'session_2',
    },
  },
  parentNotification: {
    title: 'App Access Request',
    body: 'Your child requested access to Instagram',
    data: {
      type: 'parent_app_request',
      childName: 'Alex',
      appName: 'Instagram',
      attemptId: 'attempt_recent_1',
      timeout: 30000, // 30 second response window
    },
  },
};

/**
 * Mock compliance report
 */
export const mockComplianceReport = {
  totalSessions: 15,
  completedSessions: 14,
  totalAttempts: 28,
  blockedAttempts: 22,
  approvedAttempts: 6,
  compliancePercentage: 93.3,
  averageSessionDuration: 3.8 * 60 * 60 * 1000,
  mostBlockedApp: 'Instagram',
  blockedAppsBreakdown: {
    'Instagram': 8,
    'TikTok': 7,
    'YouTube': 5,
    'Facebook': 4,
    'Snapchat': 4,
  },
};

/**
 * Mock parent override scenarios
 */
export const mockOverrideScenarios = [
  {
    type: 'extend_session',
    reason: 'Child has more homework to complete',
    duration: 30 * 60 * 1000, // 30 minutes
  },
  {
    type: 'allow_app',
    reason: 'Need to research for school project',
    appName: 'YouTube',
    duration: 10 * 60 * 1000, // 10 minutes
  },
  {
    type: 'end_early',
    reason: 'Homework completed early',
  },
  {
    type: 'disable_homework',
    reason: 'Sick day - no homework',
    duration: 24 * 60 * 60 * 1000, // Full day
  },
];

/**
 * Helper function to generate random app attempt
 */
export const generateMockAttempt = (sessionId: string): BlockedAppAttempt => {
  const blockedApps = [
    { id: 'instagram', name: 'Instagram', package: 'com.instagram.android' },
    { id: 'tiktok', name: 'TikTok', package: 'com.zhiliaoapp.musically' },
    { id: 'youtube', name: 'YouTube', package: 'com.google.android.youtube' },
    { id: 'facebook', name: 'Facebook', package: 'com.facebook.katana' },
    { id: 'snapchat', name: 'Snapchat', package: 'com.snapchat.android' },
  ];

  const app = blockedApps[Math.floor(Math.random() * blockedApps.length)];
  const responses = ['approved', 'denied', undefined];
  const response = responses[Math.floor(Math.random() * responses.length)];

  return {
    id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    appId: app.package,
    appName: app.name,
    timestamp: Date.now() - Math.random() * 60 * 60 * 1000,
    parentNotified: Math.random() > 0.3,
    parentResponse: response as any,
    responseTime: response ? Math.random() * 5000 : undefined,
  };
};

/**
 * Helper function to generate mock sessions for a child
 */
export const generateMockSessionsForChild = (
  childId: string,
  count: number = 5,
): HomeworkSession[] => {
  const sessions: HomeworkSession[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const startTime = now - (i + 1) * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000;
    const endTime = startTime + 4 * 60 * 60 * 1000;

    sessions.push({
      id: `session_mock_${i}`,
      childId,
      scheduleId: 'schedule_1',
      startTime,
      endTime,
      status: i === 0 ? 'active' : 'completed',
      blockedAppAttempts: Array.from(
        { length: Math.floor(Math.random() * 5) + 1 },
        () => generateMockAttempt(`session_mock_${i}`),
      ),
      breaksTaken: [],
      parentOverrides: [],
    });
  }

  return sessions;
};
