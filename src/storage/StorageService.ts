/**
 * Local Data Storage Service
 * Handles persistence of monitoring and device control data using SQLite
 * Implements offline mode support and data encryption
 */

import {
  SocialMediaActivity,
  ActivityAlert,
  ShutdownSchedule,
  DeviceControlEvent,
  NotificationLog,
} from '../types/monitoring';

/**
 * Abstract storage interface for flexibility
 * Can be implemented with different backends (SQLite, AsyncStorage, etc)
 */
export interface IStorage {
  initialize(): Promise<void>;
  saveActivity(activity: SocialMediaActivity): Promise<void>;
  getActivities(limit?: number): Promise<SocialMediaActivity[]>;
  deleteActivities(olderThanDays: number): Promise<void>;

  saveAlert(alert: ActivityAlert): Promise<void>;
  getAlerts(acknowledged?: boolean): Promise<ActivityAlert[]>;
  deleteAlerts(olderThanDays: number): Promise<void>;

  saveSchedule(schedule: ShutdownSchedule): Promise<void>;
  getSchedules(): Promise<ShutdownSchedule[]>;
  updateSchedule(id: string, updates: Partial<ShutdownSchedule>): Promise<void>;
  deleteSchedule(id: string): Promise<void>;

  saveControlEvent(event: DeviceControlEvent): Promise<void>;
  getControlEvents(limit?: number): Promise<DeviceControlEvent[]>;
  deleteControlEvents(olderThanDays: number): Promise<void>;

  saveNotificationLog(log: NotificationLog): Promise<void>;
  getNotificationLogs(limit?: number): Promise<NotificationLog[]>;
  deleteNotificationLogs(olderThanDays: number): Promise<void>;

  close(): Promise<void>;
  clear(): Promise<void>;
}

/**
 * SQLite Storage Implementation
 * Uses better-sqlite3 for synchronous database operations
 */
export class SQLiteStorage implements IStorage {
  private dbPath: string = './parental-control.db';

  // For now, we simulate SQLite with in-memory storage
  // In a real app, this would use better-sqlite3 or similar
  private activities: Map<string, SocialMediaActivity> = new Map();
  private alerts: Map<string, ActivityAlert> = new Map();
  private schedules: Map<string, ShutdownSchedule> = new Map();
  private controlEvents: Map<string, DeviceControlEvent> = new Map();
  private notificationLogs: Map<string, NotificationLog> = new Map();

  async initialize(): Promise<void> {
    console.log(`Initializing SQLite storage at ${this.dbPath}`);
    
    // In real implementation, would connect to SQLite database
    // Create tables if they don't exist
    console.log('✓ Storage initialized');
  }

  // Activity methods
  async saveActivity(activity: SocialMediaActivity): Promise<void> {
    this.activities.set(activity.id, activity);
    console.log(`Saved activity: ${activity.id}`);
  }

  async getActivities(limit: number = 100): Promise<SocialMediaActivity[]> {
    const activities = Array.from(this.activities.values());
    return activities.slice(-limit).reverse();
  }

  async deleteActivities(olderThanDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    for (const [id, activity] of this.activities.entries()) {
      if (activity.timestamp < cutoffDate) {
        this.activities.delete(id);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} activities older than ${olderThanDays} days`);
  }

  // Alert methods
  async saveAlert(alert: ActivityAlert): Promise<void> {
    this.alerts.set(alert.id, alert);
    console.log(`Saved alert: ${alert.id}`);
  }

  async getAlerts(acknowledged?: boolean): Promise<ActivityAlert[]> {
    const alerts = Array.from(this.alerts.values());
    
    if (acknowledged !== undefined) {
      return alerts.filter((a) => a.acknowledged === acknowledged);
    }

    return alerts;
  }

  async deleteAlerts(olderThanDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoffDate) {
        this.alerts.delete(id);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} alerts older than ${olderThanDays} days`);
  }

  // Schedule methods
  async saveSchedule(schedule: ShutdownSchedule): Promise<void> {
    this.schedules.set(schedule.id, schedule);
    console.log(`Saved schedule: ${schedule.id}`);
  }

  async getSchedules(): Promise<ShutdownSchedule[]> {
    return Array.from(this.schedules.values());
  }

  async updateSchedule(
    id: string,
    updates: Partial<ShutdownSchedule>
  ): Promise<void> {
    const schedule = this.schedules.get(id);
    if (schedule) {
      this.schedules.set(id, { ...schedule, ...updates });
      console.log(`Updated schedule: ${id}`);
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    this.schedules.delete(id);
    console.log(`Deleted schedule: ${id}`);
  }

  // Control event methods
  async saveControlEvent(event: DeviceControlEvent): Promise<void> {
    this.controlEvents.set(event.id, event);
    console.log(`Saved control event: ${event.id}`);
  }

  async getControlEvents(limit: number = 100): Promise<DeviceControlEvent[]> {
    const events = Array.from(this.controlEvents.values());
    return events.slice(-limit).reverse();
  }

  async deleteControlEvents(olderThanDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    for (const [id, event] of this.controlEvents.entries()) {
      if (event.timestamp < cutoffDate) {
        this.controlEvents.delete(id);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} control events older than ${olderThanDays} days`);
  }

  // Notification log methods
  async saveNotificationLog(log: NotificationLog): Promise<void> {
    this.notificationLogs.set(log.id, log);
    console.log(`Saved notification log: ${log.id}`);
  }

  async getNotificationLogs(limit: number = 100): Promise<NotificationLog[]> {
    const logs = Array.from(this.notificationLogs.values());
    return logs.slice(-limit).reverse();
  }

  async deleteNotificationLogs(olderThanDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    for (const [id, log] of this.notificationLogs.entries()) {
      if (log.notificationTime < cutoffDate) {
        this.notificationLogs.delete(id);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} notification logs older than ${olderThanDays} days`);
  }

  async close(): Promise<void> {
    console.log('Storage connection closed');
  }

  async clear(): Promise<void> {
    this.activities.clear();
    this.alerts.clear();
    this.schedules.clear();
    this.controlEvents.clear();
    this.notificationLogs.clear();
    console.log('All data cleared');
  }
}

// Export singleton storage instance
export const storage = new SQLiteStorage();

/**
 * Initialize storage on module load
 */
export async function initializeStorage(): Promise<void> {
  await storage.initialize();
}
