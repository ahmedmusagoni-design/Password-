/**
 * HomeworkModeService
 * Manages homework mode scheduling, app blocking, and session tracking.
 * Integrates with DeviceControlService for app enforcement.
 */

import {
  HomeworkSchedule,
  HomeworkSession,
  BlockedAppAttempt,
  BreakTime,
  ParentOverride,
  BlockedApp,
} from '@/types';

export class HomeworkModeService {
  private schedules: Map<string, HomeworkSchedule> = new Map();
  private activeSessions: Map<string, HomeworkSession> = new Map();
  private sessionTimers: Map<string, NodeJS.Timer> = new Map();
  private blockedApps: Map<string, BlockedApp> = new Map();
  private attemptLog: BlockedAppAttempt[] = [];

  // Callbacks for integration
  private onSessionStart?: (session: HomeworkSession) => void;
  private onSessionEnd?: (session: HomeworkSession) => void;
  private onAppBlocked?: (attempt: BlockedAppAttempt) => void;
  private onParentNotificationNeeded?: (attempt: BlockedAppAttempt) => void;
  private onBreakTimeRequested?: (session: HomeworkSession) => void;

  constructor() {
    this.initializeBlockedApps();
  }

  /**
   * Initialize default blocked apps
   */
  private initializeBlockedApps(): void {
    const defaultBlockedApps: BlockedApp[] = [
      {
        id: 'instagram',
        packageName: 'com.instagram.android',
        displayName: 'Instagram',
        category: 'social',
      },
      {
        id: 'tiktok',
        packageName: 'com.zhiliaoapp.musically',
        displayName: 'TikTok',
        category: 'social',
      },
      {
        id: 'snapchat',
        packageName: 'com.snapchat.android',
        displayName: 'Snapchat',
        category: 'social',
      },
      {
        id: 'youtube',
        packageName: 'com.google.android.youtube',
        displayName: 'YouTube',
        category: 'entertainment',
      },
      {
        id: 'facebook',
        packageName: 'com.facebook.katana',
        displayName: 'Facebook',
        category: 'social',
      },
    ];

    defaultBlockedApps.forEach((app) => {
      this.blockedApps.set(app.id, app);
    });
  }

  /**
   * Register callbacks for service events
   */
  public registerCallbacks({
    onSessionStart,
    onSessionEnd,
    onAppBlocked,
    onParentNotificationNeeded,
    onBreakTimeRequested,
  }: {
    onSessionStart?: (session: HomeworkSession) => void;
    onSessionEnd?: (session: HomeworkSession) => void;
    onAppBlocked?: (attempt: BlockedAppAttempt) => void;
    onParentNotificationNeeded?: (attempt: BlockedAppAttempt) => void;
    onBreakTimeRequested?: (session: HomeworkSession) => void;
  }): void {
    this.onSessionStart = onSessionStart;
    this.onSessionEnd = onSessionEnd;
    this.onAppBlocked = onAppBlocked;
    this.onParentNotificationNeeded = onParentNotificationNeeded;
    this.onBreakTimeRequested = onBreakTimeRequested;
  }

  /**
   * Create a new homework schedule
   */
  public createSchedule(
    childId: string,
    schedule: Omit<HomeworkSchedule, 'id' | 'createdAt' | 'updatedAt'>,
  ): HomeworkSchedule {
    const now = Date.now();
    const newSchedule: HomeworkSchedule = {
      ...schedule,
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.set(newSchedule.id, newSchedule);
    return newSchedule;
  }

  /**
   * Get all schedules for a child
   */
  public getSchedulesForChild(childId: string): HomeworkSchedule[] {
    return Array.from(this.schedules.values()).filter(
      (s) => s.childId === childId,
    );
  }

  /**
   * Update a homework schedule
   */
  public updateSchedule(
    scheduleId: string,
    updates: Partial<HomeworkSchedule>,
  ): HomeworkSchedule | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    const updated: HomeworkSchedule = {
      ...schedule,
      ...updates,
      id: schedule.id,
      createdAt: schedule.createdAt,
      updatedAt: Date.now(),
    };

    this.schedules.set(scheduleId, updated);
    return updated;
  }

  /**
   * Delete a homework schedule
   */
  public deleteSchedule(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId);
  }

  /**
   * Start a homework session (called by scheduler when time arrives)
   */
  public startSession(childId: string, scheduleId: string): HomeworkSession {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.enabled) {
      throw new Error(`Schedule ${scheduleId} not found or disabled`);
    }

    const now = Date.now();
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMin, 0, 0);
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const session: HomeworkSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId,
      scheduleId,
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
      status: 'active',
      blockedAppAttempts: [],
      breaksTaken: [],
      parentOverrides: [],
    };

    this.activeSessions.set(session.id, session);

    // Set up auto-end timer
    const timeUntilEnd = session.endTime - Date.now();
    if (timeUntilEnd > 0) {
      const timer = setTimeout(() => {
        this.endSession(session.id);
      }, timeUntilEnd);
      this.sessionTimers.set(session.id, timer);
    }

    if (this.onSessionStart) {
      this.onSessionStart(session);
    }

    return session;
  }

  /**
   * End a homework session
   */
  public endSession(sessionId: string): HomeworkSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    // Clear timer
    const timer = this.sessionTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.sessionTimers.delete(sessionId);
    }

    session.status = 'completed';

    if (this.onSessionEnd) {
      this.onSessionEnd(session);
    }

    return session;
  }

  /**
   * Get active session for a child
   */
  public getActiveSession(childId: string): HomeworkSession | null {
    for (const session of this.activeSessions.values()) {
      if (
        session.childId === childId &&
        session.status === 'active' &&
        session.startTime <= Date.now() &&
        session.endTime > Date.now()
      ) {
        return session;
      }
    }
    return null;
  }

  /**
   * Check if a child is currently in homework mode
   */
  public isChildInHomeworkMode(childId: string): boolean {
    return this.getActiveSession(childId) !== null;
  }

  /**
   * Get time remaining in active session
   */
  public getTimeRemaining(childId: string): number {
    const session = this.getActiveSession(childId);
    if (!session) return 0;
    return Math.max(0, session.endTime - Date.now());
  }

  /**
   * Handle app launch attempt - returns true if app should be blocked
   */
  public handleAppLaunchAttempt(
    childId: string,
    appPackageName: string,
    appName: string,
  ): boolean {
    const session = this.getActiveSession(childId);
    if (!session) return false;

    // Check if app is in blocked apps list
    const isBlocked = Array.from(this.blockedApps.values()).some(
      (app) => app.packageName === appPackageName,
    );

    if (!isBlocked) return false;

    // Log the attempt
    const attempt: BlockedAppAttempt = {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      appId: appPackageName,
      appName,
      timestamp: Date.now(),
      parentNotified: false,
    };

    session.blockedAppAttempts.push(attempt);
    this.attemptLog.push(attempt);

    if (this.onAppBlocked) {
      this.onAppBlocked(attempt);
    }

    // Notify parent (with 30 second decision window)
    if (this.onParentNotificationNeeded) {
      this.onParentNotificationNeeded(attempt);
      attempt.parentNotified = true;

      // Set timeout for parent response window
      setTimeout(() => {
        if (!attempt.parentResponse) {
          attempt.parentResponse = 'denied';
        }
      }, 30000);
    }

    return true;
  }

  /**
   * Parent approves/denies app access
   */
  public respondToAppAttempt(
    attemptId: string,
    approved: boolean,
  ): BlockedAppAttempt | null {
    const attempt = this.attemptLog.find((a) => a.id === attemptId);
    if (!attempt) return null;

    attempt.parentResponse = approved ? 'approved' : 'denied';
    attempt.responseTime = Date.now() - attempt.timestamp;

    return attempt;
  }

  /**
   * Request break time during homework session
   */
  public requestBreakTime(childId: string, durationMs: number): BreakTime | null {
    const session = this.getActiveSession(childId);
    if (!session) return null;

    // Validate break duration (5-10 minutes)
    const MIN_BREAK = 5 * 60 * 1000;
    const MAX_BREAK = 10 * 60 * 1000;

    if (durationMs < MIN_BREAK || durationMs > MAX_BREAK) {
      throw new Error(`Break duration must be between 5-10 minutes`);
    }

    const breakTime: BreakTime = {
      id: `break_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      startTime: Date.now(),
      endTime: Date.now() + durationMs,
      duration: durationMs,
      requestedByChild: true,
    };

    session.breaksTaken.push(breakTime);

    if (this.onBreakTimeRequested) {
      this.onBreakTimeRequested(session);
    }

    return breakTime;
  }

  /**
   * Check if break time is currently available
   */
  public isBreakTimeAvailable(childId: string): boolean {
    const session = this.getActiveSession(childId);
    if (!session) return false;

    // Simple logic: allow one break per session
    return session.breaksTaken.length === 0;
  }

  /**
   * Parent override - temporarily allow an app
   */
  public allowAppTemporarily(
    childId: string,
    appPackageName: string,
    durationMs: number,
    parentId: string,
    reason?: string,
  ): ParentOverride | null {
    const session = this.getActiveSession(childId);
    if (!session) return null;

    const override: ParentOverride = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      timestamp: Date.now(),
      type: 'allow_app',
      reason,
      createdBy: parentId,
    };

    session.parentOverrides.push(override);

    // Auto-revoke after duration
    setTimeout(() => {
      // In real implementation, this would trigger blocking again
    }, durationMs);

    return override;
  }

  /**
   * Parent extend session
   */
  public extendSession(
    childId: string,
    additionalMinutes: number,
    parentId: string,
  ): ParentOverride | null {
    const session = this.getActiveSession(childId);
    if (!session) return null;

    const override: ParentOverride = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      timestamp: Date.now(),
      type: 'extend_session',
      createdBy: parentId,
    };

    // Extend the session
    session.endTime += additionalMinutes * 60 * 1000;
    session.parentOverrides.push(override);

    return override;
  }

  /**
   * Parent end session early
   */
  public endSessionEarly(
    childId: string,
    parentId: string,
  ): ParentOverride | null {
    const session = this.getActiveSession(childId);
    if (!session) return null;

    const override: ParentOverride = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      timestamp: Date.now(),
      type: 'end_early',
      createdBy: parentId,
    };

    session.parentOverrides.push(override);
    this.endSession(session.id);

    return override;
  }

  /**
   * Get blocked app attempts for a session
   */
  public getSessionAttempts(sessionId: string): BlockedAppAttempt[] {
    const session = this.activeSessions.get(sessionId);
    return session?.blockedAppAttempts || [];
  }

  /**
   * Get all attempted blocked apps across all sessions
   */
  public getRecentAttempts(limit: number = 50): BlockedAppAttempt[] {
    return this.attemptLog.slice(-limit);
  }

  /**
   * Get default blocked apps
   */
  public getBlockedApps(): BlockedApp[] {
    return Array.from(this.blockedApps.values());
  }

  /**
   * Add custom blocked app
   */
  public addBlockedApp(app: BlockedApp): void {
    this.blockedApps.set(app.id, app);
  }

  /**
   * Remove blocked app
   */
  public removeBlockedApp(appId: string): void {
    this.blockedApps.delete(appId);
  }

  /**
   * Check if it's time to auto-start a scheduled session
   * Should be called periodically by a scheduler
   */
  public checkAndStartScheduledSessions(childId: string): HomeworkSession | null {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentDayOfWeek = now.getDay();

    const schedules = this.getSchedulesForChild(childId);

    for (const schedule of schedules) {
      if (!schedule.enabled) continue;

      // Check if today is a scheduled day
      if (!schedule.daysOfWeek.includes(currentDayOfWeek)) continue;

      // Check if current time matches schedule
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      if (currentHour === startHour && currentMin === startMin) {
        // Check if session already exists for today
        const existingSession = this.getActiveSession(childId);
        if (!existingSession) {
          return this.startSession(childId, schedule.id);
        }
      }
    }

    return null;
  }

  /**
   * Get next scheduled homework time for a child
   */
  public getNextScheduledTime(childId: string): {
    startTime: number;
    endTime: number;
  } | null {
    const schedules = this.getSchedulesForChild(childId).filter((s) => s.enabled);
    if (schedules.length === 0) return null;

    const now = new Date();
    let nextSchedule = null;
    let nextStartTime = Infinity;

    for (const schedule of schedules) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);

      const scheduleStart = new Date();
      scheduleStart.setHours(startHour, startMin, 0, 0);

      // If time has passed today, check tomorrow
      if (scheduleStart <= now) {
        scheduleStart.setDate(scheduleStart.getDate() + 1);
      }

      const scheduleEnd = new Date(scheduleStart);
      scheduleEnd.setHours(endHour, endMin, 0, 0);
      if (scheduleEnd <= scheduleStart) {
        scheduleEnd.setDate(scheduleEnd.getDate() + 1);
      }

      // Check if this is the next upcoming schedule day
      const daysUntilNext = (schedule.daysOfWeek.includes(
        scheduleStart.getDay(),
      )
        ? 0
        : 1) + (schedule.daysOfWeek.includes(scheduleStart.getDay()) ? 0 : 7);

      if (daysUntilNext === 0 && scheduleStart.getTime() < nextStartTime) {
        nextSchedule = schedule;
        nextStartTime = scheduleStart.getTime();
      }
    }

    if (!nextSchedule) return null;

    const [startHour, startMin] = nextSchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = nextSchedule.endTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);
    if (startDate <= now) {
      startDate.setDate(startDate.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setHours(endHour, endMin, 0, 0);
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return {
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
    };
  }
}

// Singleton instance
export const homeworkModeService = new HomeworkModeService();
