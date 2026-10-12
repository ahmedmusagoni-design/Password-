/**
 * Mock Data Generator
 * Provides realistic test data for social media monitoring and device control
 */

import {
  SocialMediaActivity,
  ActivityAlert,
  ShutdownSchedule,
  DeviceControlEvent,
  PlatformStats,
  DeviceInfo,
  HealthCheckStatus,
} from '../types/monitoring';

export class MockDataGenerator {
  /**
   * Generate mock social media activities
   */
  static generateActivities(count: number = 20): SocialMediaActivity[] {
    const activities: SocialMediaActivity[] = [];
    const platforms = ['instagram', 'tiktok', 'snapchat', 'twitter', 'youtube'] as const;
    const activityDescriptions = {
      instagram: [
        'Posted a new photo',
        'Posted a story',
        'Received direct message from @user123',
        'Got 50 new followers',
        'Liked a post',
        'Commented on friend photo',
      ],
      tiktok: [
        'Watched a 3-minute video',
        'Watched a 5-minute video',
        'Uploaded a new video',
        'Got 100 likes on video',
        'Commented on trending video',
        'Duetted a video',
      ],
      snapchat: [
        'Sent a snap to friend',
        'Received a snap from friend',
        'Posted a story',
        'Sent location to friend',
        'Added new friend',
        'Started video call',
      ],
      twitter: [
        'Tweeted about game release',
        'Retweeted trending news',
        'Liked a tweet',
        'Replied to friend tweet',
        'Sent direct message',
        'Followed new account',
      ],
      youtube: [
        'Watched gaming video (25 minutes)',
        'Watched music video (4 minutes)',
        'Subscribed to channel',
        'Liked a video',
        'Commented on video',
        'Added video to playlist',
      ],
    };

    const riskKeywords = ['inappropriate', 'suspicious', 'unknown contact'];

    for (let i = 0; i < count; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const descriptions = activityDescriptions[platform];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      const hasRisk = Math.random() < 0.15; // 15% chance of risk
      const riskLevel = hasRisk
        ? Math.random() < 0.6
          ? 'high'
          : 'medium'
        : 'low';

      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 48));

      activities.push({
        id: `activity-${i}-${Date.now()}`,
        platform,
        activityType: 'post' as any, // Simplified for demo
        username: `user_${Math.floor(Math.random() * 1000)}`,
        timestamp,
        description,
        metadata: {
          engagementCount: Math.floor(Math.random() * 500),
          commentCount: Math.floor(Math.random() * 100),
        },
        riskLevel,
        keywords: hasRisk ? [riskKeywords[Math.floor(Math.random() * riskKeywords.length)]] : [],
        duration: Math.floor(Math.random() * 60) + 1,
      });
    }

    return activities;
  }

  /**
   * Generate mock alerts
   */
  static generateAlerts(count: number = 5): ActivityAlert[] {
    const alerts: ActivityAlert[] = [];
    const riskKeywords = [
      ['inappropriate', 'content'],
      ['suspicious', 'behavior'],
      ['unknown', 'contact'],
      ['bullying', 'detected'],
      ['predatory', 'behavior'],
    ];

    for (let i = 0; i < count; i++) {
      const keywords = riskKeywords[i % riskKeywords.length];
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 24));

      alerts.push({
        id: `alert-${i}-${Date.now()}`,
        platform: ['instagram', 'tiktok', 'snapchat', 'twitter', 'youtube'][i % 5] as any,
        activityId: `activity-${i}`,
        riskLevel: Math.random() < 0.6 ? 'high' : 'medium',
        keywords,
        description: `Risky activity detected: ${keywords.join(' ')}`,
        timestamp,
        acknowledged: Math.random() < 0.3, // 30% already acknowledged
        actionTaken: Math.random() < 0.2 ? 'Blocked account' : undefined,
      });
    }

    return alerts;
  }

  /**
   * Generate mock platform statistics
   */
  static generatePlatformStats(): PlatformStats[] {
    const platforms = ['instagram', 'tiktok', 'snapchat', 'twitter', 'youtube'] as const;

    return platforms.map((platform) => ({
      platform,
      username: `user_${Math.floor(Math.random() * 1000)}`,
      totalTimeSpent: Math.floor(Math.random() * 480) + 30, // 30-510 minutes
      activitiesCount: Math.floor(Math.random() * 50) + 5,
      lastActivityTime: new Date(Date.now() - Math.random() * 3600000),
      riskCount: Math.floor(Math.random() * 5),
      followerCount: Math.floor(Math.random() * 5000) + 100,
      followingCount: Math.floor(Math.random() * 3000) + 50,
    }));
  }

  /**
   * Generate mock shutdown schedules
   */
  static generateSchedules(): ShutdownSchedule[] {
    return [
      {
        id: 'schedule-1',
        weekday: 0, // Sunday
        hour: 22,
        minute: 0,
        enabled: true,
        recurring: true,
        timezone: 'UTC',
        gracePeriod: 5,
        emergencyOverrideEnabled: true,
      },
      {
        id: 'schedule-2',
        weekday: 1, // Monday
        hour: 21,
        minute: 30,
        enabled: true,
        recurring: true,
        timezone: 'UTC',
        gracePeriod: 3,
        emergencyOverrideEnabled: false,
      },
      {
        id: 'schedule-3',
        weekday: 5, // Friday
        hour: 23,
        minute: 0,
        enabled: false,
        recurring: true,
        timezone: 'UTC',
        gracePeriod: 10,
        emergencyOverrideEnabled: true,
      },
    ];
  }

  /**
   * Generate mock control events
   */
  static generateControlEvents(count: number = 10): DeviceControlEvent[] {
    const events: DeviceControlEvent[] = [];
    const actions = ['shutdown', 'restart', 'lock'] as const;
    const reasons = ['scheduled', 'remote_trigger', 'bedtime', 'emergency'] as const;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 168)); // Within last week

      const completedAt = Math.random() < 0.8 ? new Date(timestamp.getTime() + 60000) : undefined;

      events.push({
        id: `event-${i}-${Date.now()}`,
        action: actions[i % actions.length],
        reason: reasons[i % reasons.length],
        timestamp,
        initiatedBy: Math.random() < 0.6 ? 'schedule' : 'parent',
        scheduled: true,
        countdownSeconds: 300,
        completedAt,
        success: Math.random() < 0.95, // 95% success rate
        errorMessage: Math.random() < 0.05 ? 'Device offline' : undefined,
      });
    }

    return events;
  }

  /**
   * Generate mock device info
   */
  static generateDeviceInfo(): DeviceInfo {
    const healthCheck: HealthCheckStatus = {
      lastCheck: new Date(),
      online: true,
      appVersion: '1.0.0',
      osVersion: '13.0',
      batteryLevel: 75 + Math.random() * 25,
      storageSpace: 40 + Math.random() * 40,
    };

    return {
      deviceId: `device-${Date.now()}`,
      deviceName: 'Child Android Device',
      osType: 'android',
      osVersion: '13.0',
      appVersion: '1.0.0',
      lastSyncTime: new Date(),
      healthCheck,
    };
  }

  /**
   * Generate complete mock app state
   */
  static generateMockAppState() {
    return {
      activities: MockDataGenerator.generateActivities(20),
      alerts: MockDataGenerator.generateAlerts(5),
      platformStats: MockDataGenerator.generatePlatformStats(),
      schedules: MockDataGenerator.generateSchedules(),
      controlEvents: MockDataGenerator.generateControlEvents(10),
      deviceInfo: MockDataGenerator.generateDeviceInfo(),
    };
  }
}

/**
 * Seed mock data into services
 */
export async function seedMockData(
  monitoringService: any,
  deviceService: any,
  storage: any
): Promise<void> {
  console.log('Seeding mock data...');

  // Generate and add activities
  const activities = MockDataGenerator.generateActivities(20);
  for (const activity of activities) {
    monitoringService.addActivity(activity);
    await storage.saveActivity(activity);
  }

  // Generate and add schedules
  const schedules = MockDataGenerator.generateSchedules();
  for (const schedule of schedules) {
    deviceService.createSchedule(schedule);
    await storage.saveSchedule(schedule);
  }

  console.log('✓ Mock data seeded successfully');
}
