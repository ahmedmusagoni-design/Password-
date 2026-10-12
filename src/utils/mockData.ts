/**
 * Mock data for development and testing
 */
import { AppUsageData, DailyScreenTime, WeeklyStats, SOSAlert } from '../types';
import { generateId, formatDate, getStartOfDay } from './helpers';

export const MOCK_APPS = [
  {
    appName: 'TikTok',
    packageName: 'com.zhiliaoapp.musically',
    category: 'social',
  },
  {
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    category: 'social',
  },
  {
    appName: 'YouTube',
    packageName: 'com.google.android.youtube',
    category: 'video',
  },
  {
    appName: 'Discord',
    packageName: 'com.discord',
    category: 'social',
  },
  {
    appName: 'Roblox',
    packageName: 'com.roblox.client',
    category: 'games',
  },
  {
    appName: 'Minecraft',
    packageName: 'com.mojang.minecraftpe',
    category: 'games',
  },
  {
    appName: 'Khan Academy',
    packageName: 'org.khanacademy.android',
    category: 'education',
  },
  {
    appName: 'Duolingo',
    packageName: 'com.duolingo',
    category: 'education',
  },
];

/**
 * Generate mock daily screen time data
 */
export const generateMockDailyStats = (date: Date = new Date()): DailyScreenTime => {
  const dateStr = formatDate(date);
  const dayStart = getStartOfDay(date);
  const apps: AppUsageData[] = [];
  let totalDuration = 0;

  MOCK_APPS.forEach((appInfo, index) => {
    // Generate random duration between 5-120 minutes
    const duration = (5 + Math.random() * 115) * 60 * 1000;
    totalDuration += duration;

    apps.push({
      appName: appInfo.appName,
      packageName: appInfo.packageName,
      duration,
      timestamp: dayStart + index * 3600000 + Math.random() * 1800000,
      category: appInfo.category,
    });
  });

  return {
    date: dateStr,
    totalDuration,
    apps,
    alerts: [
      {
        id: generateId(),
        timestamp: dayStart + 28800000, // 8 hours
        message: '2 hours of screen time today',
        type: 'warning',
        acknowledged: false,
      },
    ],
  };
};

/**
 * Generate mock weekly stats
 */
export const generateMockWeeklyStats = (startDate: Date = new Date()): WeeklyStats => {
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday

  const days: DailyScreenTime[] = [];
  let totalWeekly = 0;

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const dailyStats = generateMockDailyStats(currentDate);
    days.push(dailyStats);
    totalWeekly += dailyStats.totalDuration;
  }

  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return {
    weekStart: formatDate(start),
    weekEnd: formatDate(weekEnd),
    days,
    averageDaily: totalWeekly / 7,
    totalWeekly,
  };
};

/**
 * Generate mock SOS alerts
 */
export const generateMockSOSAlerts = (count: number = 5): SOSAlert[] => {
  const alerts: SOSAlert[] = [];
  const reasons = ['Emergency', 'Lost', 'Urgent help needed', 'Being followed', 'App crash'];

  for (let i = 0; i < count; i++) {
    const timestamp = Date.now() - i * 86400000; // One per day

    alerts.push({
      id: generateId(),
      childId: 'child-001',
      childName: 'Alex',
      timestamp,
      location: {
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
        accuracy: Math.floor(Math.random() * 50),
      },
      reason: reasons[i % reasons.length],
      status: i % 3 === 0 ? 'failed' : i % 2 === 0 ? 'acknowledged' : 'sent',
      retryCount: i % 3 === 0 ? 2 : 0,
      maxRetries: 3,
    });
  }

  return alerts;
};

/**
 * Get app category color
 */
export const getCategoryColor = (category?: string): string => {
  const colors: Record<string, string> = {
    social: '#FF6B6B',
    games: '#4ECDC4',
    education: '#45B7D1',
    video: '#FFA07A',
    productivity: '#98D8C8',
    utility: '#95E1D3',
    other: '#D1D5DB',
  };

  return colors[category || 'other'] || colors.other;
};

/**
 * Get app icon emoji placeholder
 */
export const getAppIcon = (appName: string): string => {
  const icons: Record<string, string> = {
    TikTok: '🎵',
    Instagram: '📷',
    YouTube: '📺',
    Discord: '💬',
    Roblox: '🎮',
    Minecraft: '⛏️',
    'Khan Academy': '📚',
    Duolingo: '🦉',
  };

  return icons[appName] || '📱';
};
