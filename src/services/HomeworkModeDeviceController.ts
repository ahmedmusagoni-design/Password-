/**
 * Device Control Integration for Homework Mode
 * Integrates homework mode blocking with the existing DeviceControlService
 */

import { homeworkModeService } from '@/services/HomeworkModeService';
import { homeworkModeDB } from '@/services/HomeworkModeDatabase';

export interface AppLaunchInterceptor {
  onAppLaunchAttempted(
    childId: string,
    appPackageName: string,
    appName: string,
  ): Promise<boolean>; // Returns true if app should be blocked
}

/**
 * HomeworkModeDeviceController
 * Provides integration point between homework mode and device control
 */
export class HomeworkModeDeviceController implements AppLaunchInterceptor {
  /**
   * Intercept app launch and check if it should be blocked
   * Returns true if app launch should be prevented
   */
  async onAppLaunchAttempted(
    childId: string,
    appPackageName: string,
    appName: string,
  ): Promise<boolean> {
    try {
      // Check if child is in homework mode
      const shouldBlock = homeworkModeService.handleAppLaunchAttempt(
        childId,
        appPackageName,
        appName,
      );

      if (shouldBlock) {
        // Log the attempt to database
        const session = homeworkModeService.getActiveSession(childId);
        if (session) {
          const attempt = session.blockedAppAttempts[session.blockedAppAttempts.length - 1];
          if (attempt) {
            await homeworkModeDB.recordAttempt(attempt);
          }
        }
      }

      return shouldBlock;
    } catch (error) {
      console.error('Error in app launch interceptor:', error);
      return false;
    }
  }

  /**
   * Get the block screen content to show when an app is blocked
   */
  getBlockScreenContent(
    appName: string,
    childName: string,
    timeRemaining: number,
  ): BlockScreenContent {
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m ${seconds}s`;
    };

    return {
      title: 'App Blocked',
      subtitle: `${appName} is blocked`,
      message: `Hi ${childName}! During homework time, this app is blocked to help you stay focused on learning.`,
      timeRemaining: formatTime(timeRemaining),
      timeRemainingLabel: 'Homework ends in',
      buttons: [
        {
          id: 'dismiss',
          label: 'Got It',
          action: 'dismiss',
          color: '#666',
        },
        {
          id: 'request',
          label: 'Request Access',
          action: 'request_access',
          color: '#FF9800',
        },
      ],
      emoji: '📚',
      backgroundColor: '#FFF3E0',
      accentColor: '#FF9800',
    };
  }

  /**
   * Process parent's response to child's app access request
   */
  async processParentResponse(
    attemptId: string,
    approved: boolean,
    durationMs?: number,
  ): Promise<boolean> {
    try {
      const response = homeworkModeService.respondToAppAttempt(attemptId, approved);

      if (response && approved && durationMs) {
        // Record the approval in database
        await homeworkModeDB.recordAttempt(response);
      }

      return !!response;
    } catch (error) {
      console.error('Error processing parent response:', error);
      return false;
    }
  }

  /**
   * Get list of currently blocked apps during homework
   */
  getBlockedAppsForHomework(): BlockedAppInfo[] {
    return homeworkModeService.getBlockedApps().map((app) => ({
      id: app.id,
      packageName: app.packageName,
      displayName: app.displayName,
      category: app.category,
    }));
  }

  /**
   * Check if an app is currently blocked
   */
  isAppCurrentlyBlocked(childId: string, appPackageName: string): boolean {
    const session = homeworkModeService.getActiveSession(childId);
    if (!session) return false;

    const blockedApps = homeworkModeService.getBlockedApps();
    return blockedApps.some((app) => app.packageName === appPackageName);
  }

  /**
   * Get remaining homework time for a child
   */
  getRemainingHomeworkTime(childId: string): number {
    return homeworkModeService.getTimeRemaining(childId);
  }

  /**
   * Get child's homework status
   */
  async getHomeworkStatus(childId: string): Promise<HomeworkStatus> {
    try {
      const isInHomework = homeworkModeService.isChildInHomeworkMode(childId);
      const session = homeworkModeService.getActiveSession(childId);
      const nextSchedule = homeworkModeService.getNextScheduledTime(childId);

      return {
        isInHomeworkMode: isInHomework,
        currentSession: session || undefined,
        timeRemaining: isInHomework ? this.getRemainingHomeworkTime(childId) : 0,
        nextSchedule: nextSchedule || undefined,
        blockedAppsCount: this.getBlockedAppsForHomework().length,
      };
    } catch (error) {
      console.error('Error getting homework status:', error);
      return {
        isInHomeworkMode: false,
        timeRemaining: 0,
        blockedAppsCount: 0,
      };
    }
  }

  /**
   * Get detailed analytics for parent dashboard
   */
  async getHomeworkAnalytics(
    childId: string,
    days: number = 7,
  ): Promise<HomeworkAnalytics> {
    try {
      const endDate = Date.now();
      const startDate = endDate - days * 24 * 60 * 60 * 1000;

      const report = await homeworkModeDB.getComplianceReport(
        childId,
        startDate,
        endDate,
      );

      const recentAttempts = await homeworkModeDB.getRecentAttempts(100);
      const childAttempts = recentAttempts.filter(
        (a) =>
          a.timestamp >= startDate &&
          a.timestamp <= endDate,
      );

      const blockedAppsCount: Record<string, number> = {};
      childAttempts.forEach((attempt) => {
        blockedAppsCount[attempt.appName] =
          (blockedAppsCount[attempt.appName] || 0) + 1;
      });

      return {
        period: { startDate, endDate },
        compliance: {
          totalSessions: report.totalSessions,
          completedSessions: report.completedSessions,
          completionRate: report.totalSessions > 0
            ? (report.completedSessions / report.totalSessions) * 100
            : 0,
        },
        appAttempts: {
          total: report.totalAttempts,
          blocked: report.blockedAttempts,
          approved: report.approvedAttempts,
          approvalRate: report.totalAttempts > 0
            ? (report.approvedAttempts / report.totalAttempts) * 100
            : 0,
        },
        mostBlockedApp: Object.entries(blockedAppsCount).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0],
        blockedAppsBreakdown: blockedAppsCount,
      };
    } catch (error) {
      console.error('Error getting homework analytics:', error);
      return {
        period: { startDate: Date.now(), endDate: Date.now() },
        compliance: {
          totalSessions: 0,
          completedSessions: 0,
          completionRate: 0,
        },
        appAttempts: {
          total: 0,
          blocked: 0,
          approved: 0,
          approvalRate: 0,
        },
      };
    }
  }
}

/**
 * Type definitions
 */
export interface BlockScreenContent {
  title: string;
  subtitle: string;
  message: string;
  timeRemaining: string;
  timeRemainingLabel: string;
  buttons: Array<{
    id: string;
    label: string;
    action: 'dismiss' | 'request_access';
    color: string;
  }>;
  emoji: string;
  backgroundColor: string;
  accentColor: string;
}

export interface BlockedAppInfo {
  id: string;
  packageName: string;
  displayName: string;
  category: 'social' | 'entertainment' | 'other';
}

export interface HomeworkStatus {
  isInHomeworkMode: boolean;
  currentSession?: any;
  timeRemaining: number;
  nextSchedule?: { startTime: number; endTime: number };
  blockedAppsCount: number;
}

export interface HomeworkAnalytics {
  period: { startDate: number; endDate: number };
  compliance: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
  };
  appAttempts: {
    total: number;
    blocked: number;
    approved: number;
    approvalRate: number;
  };
  mostBlockedApp?: string;
  blockedAppsBreakdown?: Record<string, number>;
}

// Singleton instance
export const homeworkModeDeviceController = new HomeworkModeDeviceController();
