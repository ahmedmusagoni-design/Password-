/**
 * Social Media Monitoring Service
 * Handles monitoring of social media activity across all platforms
 * Manages permissions, activity tracking, risk detection, and alerts
 */

import {
  SocialMediaActivity,
  SocialMediaPlatform,
  ActivityType,
  PlatformStats,
  ActivityAlert,
  MonitoringPermission,
  PermissionRequest,
  NotificationLog,
} from '../types/monitoring';

export class SocialMediaMonitoringService {
  private activities: SocialMediaActivity[] = [];
  private platformStats: Map<SocialMediaPlatform, PlatformStats> = new Map();
  private alerts: ActivityAlert[] = [];
  private permissions: Map<SocialMediaPlatform, MonitoringPermission> = new Map();
  private notificationLogs: NotificationLog[] = [];
  private isMonitoring: boolean = false;

  // Risk keywords for detecting concerning content
  private readonly RISK_KEYWORDS = {
    high: ['suicide', 'self-harm', 'bullying', 'harassment', 'predator', 'grooming'],
    medium: ['inappropriate', 'suspicious', 'unknown contact', 'risky'],
  };

  // Platform-specific handlers
  private platformHandlers: Record<SocialMediaPlatform, () => Promise<void>> = {
    instagram: this.monitorInstagram.bind(this),
    tiktok: this.monitorTikTok.bind(this),
    snapchat: this.monitorSnapchat.bind(this),
    twitter: this.monitorTwitter.bind(this),
    youtube: this.monitorYouTube.bind(this),
  };

  constructor() {
    this.initializePlatformStats();
  }

  /**
   * Initialize empty stats for each platform
   */
  private initializePlatformStats(): void {
    const platforms: SocialMediaPlatform[] = ['instagram', 'tiktok', 'snapchat', 'twitter', 'youtube'];
    platforms.forEach((platform) => {
      this.platformStats.set(platform, {
        platform,
        totalTimeSpent: 0,
        activitiesCount: 0,
        lastActivityTime: new Date(),
        riskCount: 0,
      });
    });
  }

  /**
   * Request permission to monitor a platform
   */
  async requestPermission(request: PermissionRequest): Promise<boolean> {
    console.log(`Requesting permission for ${request.platform}:`, request.requiredScopes);
    
    try {
      // Simulate permission request - in real app, this calls native API
      // For now, we grant it automatically for demo purposes
      const permission: MonitoringPermission = {
        platform: request.platform,
        granted: true,
        timestamp: new Date(),
        scope: request.requiredScopes,
      };
      
      this.permissions.set(request.platform, permission);
      console.log(`✓ Permission granted for ${request.platform}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to request permission for ${request.platform}:`, error);
      return false;
    }
  }

  /**
   * Check if monitoring is permitted for a platform
   */
  hasPermission(platform: SocialMediaPlatform): boolean {
    const permission = this.permissions.get(platform);
    return permission?.granted ?? false;
  }

  /**
   * Get all permissions
   */
  getPermissions(): MonitoringPermission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Start monitoring all platforms
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Monitoring already active');
      return;
    }

    console.log('Starting social media monitoring...');
    this.isMonitoring = true;

    try {
      // Request permissions for all platforms
      const platforms: SocialMediaPlatform[] = ['instagram', 'tiktok', 'snapchat', 'twitter', 'youtube'];
      for (const platform of platforms) {
        const scopes = this.getPlatformScopes(platform);
        await this.requestPermission({
          platform,
          requiredScopes: scopes,
          reason: 'Monitor activity for parental control',
        });
      }

      // Start monitoring each platform
      for (const platform of platforms) {
        if (this.hasPermission(platform)) {
          await this.platformHandlers[platform]();
        }
      }

      console.log('✓ Monitoring started successfully');
    } catch (error) {
      console.error('✗ Failed to start monitoring:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    console.log('Stopping social media monitoring...');
    this.isMonitoring = false;
  }

  /**
   * Add activity to tracking
   */
  addActivity(activity: SocialMediaActivity): void {
    this.activities.push(activity);
    this.updatePlatformStats(activity);
    this.checkForRisks(activity);
  }

  /**
   * Get all activities
   */
  getActivities(): SocialMediaActivity[] {
    return [...this.activities];
  }

  /**
   * Get activities for specific platform
   */
  getActivitiesByPlatform(platform: SocialMediaPlatform): SocialMediaActivity[] {
    return this.activities.filter((a) => a.platform === platform);
  }

  /**
   * Get platform statistics
   */
  getPlatformStats(): PlatformStats[] {
    return Array.from(this.platformStats.values());
  }

  /**
   * Get alerts
   */
  getAlerts(): ActivityAlert[] {
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, actionTaken?: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.actionTaken = actionTaken;
      console.log(`Alert ${alertId} acknowledged`);
    }
  }

  /**
   * Get notification logs
   */
  getNotificationLogs(): NotificationLog[] {
    return [...this.notificationLogs];
  }

  /**
   * Internal: Update platform statistics when activity is added
   */
  private updatePlatformStats(activity: SocialMediaActivity): void {
    const stats = this.platformStats.get(activity.platform);
    if (stats) {
      stats.activitiesCount++;
      stats.lastActivityTime = activity.timestamp;
      if (activity.duration) {
        stats.totalTimeSpent += activity.duration;
      }
      if (activity.riskLevel !== 'low') {
        stats.riskCount++;
      }
    }
  }

  /**
   * Internal: Check activity for risks
   */
  private checkForRisks(activity: SocialMediaActivity): void {
    const lowerDescription = activity.description.toLowerCase();
    
    // Check high-risk keywords
    const highRiskMatches = this.RISK_KEYWORDS.high.filter((keyword) =>
      lowerDescription.includes(keyword)
    );

    if (highRiskMatches.length > 0) {
      this.createAlert(activity, 'high', highRiskMatches);
      return;
    }

    // Check medium-risk keywords
    const mediumRiskMatches = this.RISK_KEYWORDS.medium.filter((keyword) =>
      lowerDescription.includes(keyword)
    );

    if (mediumRiskMatches.length > 0) {
      this.createAlert(activity, 'medium', mediumRiskMatches);
    }
  }

  /**
   * Internal: Create alert for risky activity
   */
  private createAlert(
    activity: SocialMediaActivity,
    riskLevel: 'high' | 'medium',
    keywords: string[]
  ): void {
    const alert: ActivityAlert = {
      id: `alert-${Date.now()}`,
      platform: activity.platform,
      activityId: activity.id,
      riskLevel,
      keywords,
      description: `Risky activity detected on ${activity.platform}: ${activity.description}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Log notification
    const notification: NotificationLog = {
      id: `notif-${Date.now()}`,
      parentNotified: false,
      notificationTime: new Date(),
      alertId: alert.id,
      deliveryStatus: 'pending',
      method: 'push',
    };

    this.notificationLogs.push(notification);
    console.log(`⚠️ Alert created: ${alert.description}`);
  }

  /**
   * Get required scopes for a platform
   */
  private getPlatformScopes(platform: SocialMediaPlatform): string[] {
    const scopes: Record<SocialMediaPlatform, string[]> = {
      instagram: ['activity_read', 'follower_read', 'dm_read', 'story_read'],
      tiktok: ['watch_history_read', 'engagement_read', 'profile_read'],
      snapchat: ['message_read', 'story_read', 'location_read'],
      twitter: ['tweet_read', 'interaction_read', 'dm_read', 'follow_read'],
      youtube: ['watch_history_read', 'subscription_read', 'recommendation_read'],
    };
    return scopes[platform] || [];
  }

  /**
   * Platform-specific monitor: Instagram
   */
  private async monitorInstagram(): Promise<void> {
    console.log('Monitoring Instagram activity...');
    // Simulate activity collection
    // In real implementation, this would use Instagram API or device permissions
  }

  /**
   * Platform-specific monitor: TikTok
   */
  private async monitorTikTok(): Promise<void> {
    console.log('Monitoring TikTok activity...');
    // Simulate activity collection
  }

  /**
   * Platform-specific monitor: Snapchat
   */
  private async monitorSnapchat(): Promise<void> {
    console.log('Monitoring Snapchat activity...');
    // Simulate activity collection
  }

  /**
   * Platform-specific monitor: Twitter/X
   */
  private async monitorTwitter(): Promise<void> {
    console.log('Monitoring Twitter/X activity...');
    // Simulate activity collection
  }

  /**
   * Platform-specific monitor: YouTube
   */
  private async monitorYouTube(): Promise<void> {
    console.log('Monitoring YouTube activity...');
    // Simulate activity collection
  }

  /**
   * Clear all data (for testing)
   */
  reset(): void {
    this.activities = [];
    this.alerts = [];
    this.notificationLogs = [];
    this.initializePlatformStats();
    this.isMonitoring = false;
  }
}

// Export singleton instance
export const monitoringService = new SocialMediaMonitoringService();
