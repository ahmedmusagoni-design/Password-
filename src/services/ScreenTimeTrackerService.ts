import { AppUsageData } from '../types';
import { db } from '../utils/database';
import { formatDate } from '../utils/helpers';
import { logger } from '../utils/logger';

interface UsageRow {
  app_name: string;
  package_name: string;
  duration: number;
  timestamp: number;
  category: string | null;
}

export class ScreenTimeTrackerService {
  public async initialize(): Promise<void> {
    logger.info('Native app-usage collection is not configured in this Expo build');
  }

  public async startTracking(): Promise<void> {
    throw new Error(
      'Automated app-usage tracking requires an authorized native platform integration.',
    );
  }

  public async stopTracking(): Promise<void> {
    return Promise.resolve();
  }

  public async getTodayUsage(): Promise<AppUsageData[]> {
    return this.getUsageForDate(new Date());
  }

  public async getUsageForDate(date: Date): Promise<AppUsageData[]> {
    const dateString = formatDate(date);

    return this.queryUsage(
      `SELECT app_name, package_name, duration, timestamp, category
       FROM app_usage
       WHERE date_str = ?
       ORDER BY timestamp ASC`,
      [dateString],
    );
  }

  public async getUsageForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<AppUsageData[]> {
    return this.queryUsage(
      `SELECT app_name, package_name, duration, timestamp, category
       FROM app_usage
       WHERE date_str >= ? AND date_str <= ?
       ORDER BY timestamp ASC`,
      [formatDate(startDate), formatDate(endDate)],
    );
  }

  public async clearAllData(): Promise<void> {
    const database = await db;

    await database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM app_usage;');
      await database.runAsync('DELETE FROM daily_stats;');
    });
  }

  private async queryUsage(
    sql: string,
    parameters: string[],
  ): Promise<AppUsageData[]> {
    try {
      const database = await db;
      const rows = await database.getAllAsync<UsageRow>(sql, parameters);

      return rows.map((row) => ({
        appName: row.app_name,
        packageName: row.package_name,
        duration: row.duration,
        timestamp: row.timestamp,
        category: row.category || undefined,
      }));
    } catch (error) {
      logger.error('Failed to read local screen-time summaries', error);
      throw error;
    }
  }
}

export const screenTimeTrackerService = new ScreenTimeTrackerService();
