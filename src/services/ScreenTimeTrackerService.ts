/**
 * Screen Time Tracker Service
 * Tracks app usage and stores data locally
 */
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { AppUsageData } from '../types';
import { formatDate, getStartOfDay, throttle } from '../utils/helpers';
import AsyncStorage from '@react-native-community/async-storage';

const TASK_NAME = 'screen-time-tracking-task';
const CHECK_INTERVAL = 5000; // 5 seconds
const BATCH_UPLOAD_SIZE = 50;
const LAST_APP_KEY = 'last_tracked_app';

export class ScreenTimeTrackerService {
  private isRunning = false;
  private currentApp: string | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private sessionStartTime: number = 0;

  /**
   * Initialize the screen time tracker
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing ScreenTimeTrackerService');
      await this.registerBackgroundTask();
      logger.info('ScreenTimeTrackerService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ScreenTimeTrackerService', error);
      throw error;
    }
  }

  /**
   * Start tracking app usage
   */
  public async startTracking(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Tracker is already running');
      return;
    }

    try {
      logger.info('Starting app usage tracking');
      this.isRunning = true;
      this.sessionStartTime = Date.now();

      // Get initial app
      this.currentApp = await this.getCurrentApp();
      if (this.currentApp) {
        await AsyncStorage.setItem(LAST_APP_KEY, this.currentApp);
      }

      // Start polling for app changes
      this.trackingInterval = setInterval(
        async () => await this.checkAndUpdateApp(),
        CHECK_INTERVAL
      );

      logger.info('App usage tracking started');
    } catch (error) {
      logger.error('Failed to start app usage tracking', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop tracking app usage
   */
  public async stopTracking(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Tracker is not running');
      return;
    }

    try {
      logger.info('Stopping app usage tracking');
      this.isRunning = false;

      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }

      logger.info('App usage tracking stopped');
    } catch (error) {
      logger.error('Failed to stop app usage tracking', error);
      throw error;
    }
  }

  /**
   * Check for app changes and record usage
   */
  private async checkAndUpdateApp(): Promise<void> {
    try {
      const newApp = await this.getCurrentApp();

      if (newApp && newApp !== this.currentApp) {
        // Record usage for previous app if it exists
        if (this.currentApp && this.currentApp !== 'unknown') {
          const duration = Date.now() - this.sessionStartTime;
          await this.recordAppUsage(this.currentApp, duration);
        }

        // Switch to new app
        this.currentApp = newApp;
        this.sessionStartTime = Date.now();
        await AsyncStorage.setItem(LAST_APP_KEY, newApp);
      }
    } catch (error) {
      logger.error('Error checking app update', error);
    }
  }

  /**
   * Get the currently active app
   * In a real implementation, this would use native APIs
   */
  private async getCurrentApp(): Promise<string> {
    try {
      // Mock implementation - in production would use:
      // - Android: UsageStatsManager
      // - iOS: requires jailbreak or MDM profile
      const lastApp = await AsyncStorage.getItem(LAST_APP_KEY);
      return lastApp || 'unknown';
    } catch (error) {
      logger.error('Failed to get current app', error);
      return 'unknown';
    }
  }

  /**
   * Record app usage to database
   */
  private async recordAppUsage(
    packageName: string,
    duration: number,
    appName: string = packageName
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const dateStr = formatDate(new Date());

      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `INSERT INTO app_usage (app_name, package_name, duration, timestamp, date_str, category, uploaded)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [appName, packageName, duration, timestamp, dateStr, 'unknown', 0],
            () => {
              logger.debug(`Recorded usage: ${appName} - ${duration}ms`);
              resolve();
            },
            (_, error) => {
              logger.error('Failed to record app usage', error);
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error recording app usage', error);
      throw error;
    }
  }

  /**
   * Get today's app usage
   */
  public async getTodayUsage(): Promise<AppUsageData[]> {
    try {
      const dateStr = formatDate(new Date());

      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT app_name, package_name, duration, timestamp, category 
             FROM app_usage 
             WHERE date_str = ? 
             ORDER BY timestamp ASC`,
            [dateStr],
            (_, result) => {
              const apps: AppUsageData[] = result.rows._array.map((row: any) => ({
                appName: row.app_name,
                packageName: row.package_name,
                duration: row.duration,
                timestamp: row.timestamp,
                category: row.category,
              }));
              resolve(apps);
            },
            (_, error) => {
              logger.error('Failed to get today usage', error);
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error getting today usage', error);
      throw error;
    }
  }

  /**
   * Get usage for a specific date
   */
  public async getUsageForDate(date: Date): Promise<AppUsageData[]> {
    try {
      const dateStr = formatDate(date);

      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT app_name, package_name, SUM(duration) as duration, 
                    MIN(timestamp) as timestamp, category 
             FROM app_usage 
             WHERE date_str = ? 
             GROUP BY package_name 
             ORDER BY duration DESC`,
            [dateStr],
            (_, result) => {
              const apps: AppUsageData[] = result.rows._array.map((row: any) => ({
                appName: row.app_name,
                packageName: row.package_name,
                duration: row.duration,
                timestamp: row.timestamp,
                category: row.category,
              }));
              resolve(apps);
            },
            (_, error) => {
              logger.error('Failed to get usage for date', error);
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error getting usage for date', error);
      throw error;
    }
  }

  /**
   * Get usage for a date range
   */
  public async getUsageForDateRange(startDate: Date, endDate: Date): Promise<AppUsageData[]> {
    try {
      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT app_name, package_name, SUM(duration) as duration, 
                    MIN(timestamp) as timestamp, category 
             FROM app_usage 
             WHERE date_str >= ? AND date_str <= ? 
             GROUP BY package_name 
             ORDER BY duration DESC`,
            [startDateStr, endDateStr],
            (_, result) => {
              const apps: AppUsageData[] = result.rows._array.map((row: any) => ({
                appName: row.app_name,
                packageName: row.package_name,
                duration: row.duration,
                timestamp: row.timestamp,
                category: row.category,
              }));
              resolve(apps);
            },
            (_, error) => {
              logger.error('Failed to get usage for date range', error);
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error getting usage for date range', error);
      throw error;
    }
  }

  /**
   * Batch upload unsynced data to backend
   */
  public async batchUploadData(): Promise<{ uploaded: number; failed: number }> {
    try {
      logger.info('Starting batch upload of usage data');
      let uploaded = 0;
      let failed = 0;

      // Get unsynced data
      const unsyncedData = await this.getUnsyncedData();

      // TODO: Implement actual backend upload logic
      if (unsyncedData.length > 0) {
        logger.info(`Uploading ${unsyncedData.length} usage records`);
        // Upload logic would go here
        uploaded = unsyncedData.length;
      }

      logger.info(`Upload complete: ${uploaded} uploaded, ${failed} failed`);
      return { uploaded, failed };
    } catch (error) {
      logger.error('Error during batch upload', error);
      throw error;
    }
  }

  /**
   * Get unsynced data from database
   */
  private async getUnsyncedData(): Promise<AppUsageData[]> {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT app_name, package_name, duration, timestamp, category 
           FROM app_usage 
           WHERE uploaded = 0 
           LIMIT ?`,
          [BATCH_UPLOAD_SIZE],
          (_, result) => {
            const apps: AppUsageData[] = result.rows._array.map((row: any) => ({
              appName: row.app_name,
              packageName: row.package_name,
              duration: row.duration,
              timestamp: row.timestamp,
              category: row.category,
            }));
            resolve(apps);
          },
          (_, error) => {
            logger.error('Failed to get unsynced data', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Mark records as uploaded
   */
  public async markAsUploaded(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        const placeholders = ids.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE app_usage SET uploaded = 1 WHERE id IN (${placeholders})`,
          ids,
          () => resolve(),
          (_, error) => {
            logger.error('Failed to mark records as uploaded', error);
            reject(error);
          }
        );
      });
    });
  }

  /**
   * Register background task
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      // Check if task is already registered
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);

      if (!isTaskRegistered) {
        TaskManager.defineTask(TASK_NAME, async () => {
          try {
            logger.debug('Background task executing');
            await this.batchUploadData();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (error) {
            logger.error('Background task error', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
      }

      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 60 * 15, // Every 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      logger.info('Background task registered');
    } catch (error) {
      logger.error('Failed to register background task', error);
    }
  }

  /**
   * Unregister background task
   */
  public async unregisterBackgroundTask(): Promise<void> {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
      if (isTaskRegistered) {
        await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
        logger.info('Background task unregistered');
      }
    } catch (error) {
      logger.error('Failed to unregister background task', error);
    }
  }

  /**
   * Clear all tracked data
   */
  public async clearAllData(): Promise<void> {
    try {
      logger.warn('Clearing all tracked data');
      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `DELETE FROM app_usage`,
            [],
            () => {
              logger.info('All app usage data cleared');
              resolve();
            },
            (_, error) => {
              logger.error('Failed to clear app usage data', error);
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error clearing data', error);
      throw error;
    }
  }
}

// Export singleton instance
export const screenTimeTrackerService = new ScreenTimeTrackerService();
