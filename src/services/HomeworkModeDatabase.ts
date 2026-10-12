/**
 * HomeworkModeDatabase Service
 * Manages SQLite database operations for homework mode data
 */

import * as SQLite from 'expo-sqlite';
import {
  HomeworkSchedule,
  HomeworkSession,
  BlockedAppAttempt,
  BreakTime,
} from '@/types';

export class HomeworkModeDatabase {
  private db: SQLite.Database | null = null;
  private dbName = 'homework_mode.db';

  /**
   * Initialize database and create tables if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.createTables();
      console.log('HomeworkModeDatabase initialized');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Homework Schedules Table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS homework_schedules (
          id TEXT PRIMARY KEY,
          childId TEXT NOT NULL,
          name TEXT NOT NULL,
          startTime TEXT NOT NULL,
          endTime TEXT NOT NULL,
          daysOfWeek TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
      `);

      // Homework Sessions Table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS homework_sessions (
          id TEXT PRIMARY KEY,
          childId TEXT NOT NULL,
          scheduleId TEXT NOT NULL,
          startTime INTEGER NOT NULL,
          endTime INTEGER NOT NULL,
          status TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
      `);

      // Blocked App Attempts Table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS blocked_app_attempts (
          id TEXT PRIMARY KEY,
          sessionId TEXT NOT NULL,
          appId TEXT NOT NULL,
          appName TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          parentNotified INTEGER NOT NULL,
          parentResponse TEXT,
          responseTime INTEGER,
          createdAt INTEGER NOT NULL
        );
      `);

      // Break Time Log Table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS break_time_log (
          id TEXT PRIMARY KEY,
          sessionId TEXT NOT NULL,
          startTime INTEGER NOT NULL,
          endTime INTEGER NOT NULL,
          duration INTEGER NOT NULL,
          requestedByChild INTEGER NOT NULL,
          createdAt INTEGER NOT NULL
        );
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Save a homework schedule
   */
  async saveSchedule(schedule: HomeworkSchedule): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const daysOfWeekJson = JSON.stringify(schedule.daysOfWeek);

      await this.db.runAsync(
        `INSERT OR REPLACE INTO homework_schedules
         (id, childId, name, startTime, endTime, daysOfWeek, enabled, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schedule.id,
          schedule.childId,
          schedule.name,
          schedule.startTime,
          schedule.endTime,
          daysOfWeekJson,
          schedule.enabled ? 1 : 0,
          schedule.createdAt,
          schedule.updatedAt,
        ],
      );
    } catch (error) {
      console.error('Failed to save schedule:', error);
      throw error;
    }
  }

  /**
   * Get schedules for a child
   */
  async getSchedulesForChild(childId: string): Promise<HomeworkSchedule[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<any>(
        'SELECT * FROM homework_schedules WHERE childId = ? ORDER BY createdAt DESC',
        [childId],
      );

      return result.map((row) => ({
        ...row,
        daysOfWeek: JSON.parse(row.daysOfWeek),
      }));
    } catch (error) {
      console.error('Failed to get schedules:', error);
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'DELETE FROM homework_schedules WHERE id = ?',
        [scheduleId],
      );
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  /**
   * Save a homework session
   */
  async saveSession(session: HomeworkSession): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = Date.now();

      await this.db.runAsync(
        `INSERT OR REPLACE INTO homework_sessions
         (id, childId, scheduleId, startTime, endTime, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.childId,
          session.scheduleId,
          session.startTime,
          session.endTime,
          session.status,
          session.startTime, // Use session start time as creation time
          now,
        ],
      );
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Get active session for a child
   */
  async getActiveSession(childId: string): Promise<HomeworkSession | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = Date.now();
      const result = await this.db.getFirstAsync<any>(
        `SELECT * FROM homework_sessions
         WHERE childId = ? AND status = 'active'
         AND startTime <= ? AND endTime > ?
         ORDER BY startTime DESC
         LIMIT 1`,
        [childId, now, now],
      );

      return result || null;
    } catch (error) {
      console.error('Failed to get active session:', error);
      throw error;
    }
  }

  /**
   * Get session history for a child
   */
  async getSessionHistory(
    childId: string,
    limit: number = 50,
  ): Promise<HomeworkSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<HomeworkSession>(
        `SELECT * FROM homework_sessions
         WHERE childId = ?
         ORDER BY startTime DESC
         LIMIT ?`,
        [childId, limit],
      );

      return result;
    } catch (error) {
      console.error('Failed to get session history:', error);
      throw error;
    }
  }

  /**
   * Record a blocked app attempt
   */
  async recordAttempt(attempt: BlockedAppAttempt): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = Date.now();

      await this.db.runAsync(
        `INSERT INTO blocked_app_attempts
         (id, sessionId, appId, appName, timestamp, parentNotified, parentResponse, responseTime, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attempt.id,
          attempt.sessionId,
          attempt.appId,
          attempt.appName,
          attempt.timestamp,
          attempt.parentNotified ? 1 : 0,
          attempt.parentResponse || null,
          attempt.responseTime || null,
          now,
        ],
      );
    } catch (error) {
      console.error('Failed to record attempt:', error);
      throw error;
    }
  }

  /**
   * Get attempts for a session
   */
  async getSessionAttempts(sessionId: string): Promise<BlockedAppAttempt[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<any>(
        `SELECT * FROM blocked_app_attempts
         WHERE sessionId = ?
         ORDER BY timestamp DESC`,
        [sessionId],
      );

      return result.map((row) => ({
        ...row,
        parentNotified: row.parentNotified === 1,
      }));
    } catch (error) {
      console.error('Failed to get session attempts:', error);
      throw error;
    }
  }

  /**
   * Get recent attempts across all sessions
   */
  async getRecentAttempts(limit: number = 50): Promise<BlockedAppAttempt[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<any>(
        `SELECT * FROM blocked_app_attempts
         ORDER BY timestamp DESC
         LIMIT ?`,
        [limit],
      );

      return result.map((row) => ({
        ...row,
        parentNotified: row.parentNotified === 1,
      }));
    } catch (error) {
      console.error('Failed to get recent attempts:', error);
      throw error;
    }
  }

  /**
   * Record break time
   */
  async recordBreakTime(breakTime: BreakTime): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const now = Date.now();

      await this.db.runAsync(
        `INSERT INTO break_time_log
         (id, sessionId, startTime, endTime, duration, requestedByChild, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          breakTime.id,
          breakTime.sessionId,
          breakTime.startTime,
          breakTime.endTime,
          breakTime.duration,
          breakTime.requestedByChild ? 1 : 0,
          now,
        ],
      );
    } catch (error) {
      console.error('Failed to record break time:', error);
      throw error;
    }
  }

  /**
   * Get break time log for a session
   */
  async getSessionBreakTimes(sessionId: string): Promise<BreakTime[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync<any>(
        `SELECT * FROM break_time_log
         WHERE sessionId = ?
         ORDER BY startTime DESC`,
        [sessionId],
      );

      return result.map((row) => ({
        ...row,
        requestedByChild: row.requestedByChild === 1,
      }));
    } catch (error) {
      console.error('Failed to get break times:', error);
      throw error;
    }
  }

  /**
   * Get homework compliance report for a date range
   */
  async getComplianceReport(
    childId: string,
    startDate: number,
    endDate: number,
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalAttempts: number;
    blockedAttempts: number;
    approvedAttempts: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Total and completed sessions
      const sessions = await this.db.getAllAsync<any>(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM homework_sessions
         WHERE childId = ? AND startTime >= ? AND startTime <= ?`,
        [childId, startDate, endDate],
      );

      // App attempts and responses
      const attempts = await this.db.getAllAsync<any>(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN parentResponse IS NULL THEN 1 ELSE 0 END) as blocked,
           SUM(CASE WHEN parentResponse = 'approved' THEN 1 ELSE 0 END) as approved
         FROM blocked_app_attempts baa
         JOIN homework_sessions hs ON baa.sessionId = hs.id
         WHERE hs.childId = ? AND baa.timestamp >= ? AND baa.timestamp <= ?`,
        [childId, startDate, endDate],
      );

      return {
        totalSessions: sessions[0]?.total || 0,
        completedSessions: sessions[0]?.completed || 0,
        totalAttempts: attempts[0]?.total || 0,
        blockedAttempts: attempts[0]?.blocked || 0,
        approvedAttempts: attempts[0]?.approved || 0,
      };
    } catch (error) {
      console.error('Failed to get compliance report:', error);
      throw error;
    }
  }

  /**
   * Clean up old data (older than 30 days)
   */
  async cleanupOldData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      await this.db.runAsync(
        'DELETE FROM blocked_app_attempts WHERE createdAt < ?',
        [thirtyDaysAgo],
      );

      await this.db.runAsync(
        'DELETE FROM break_time_log WHERE createdAt < ?',
        [thirtyDaysAgo],
      );

      await this.db.runAsync(
        'DELETE FROM homework_sessions WHERE createdAt < ? AND status = ?',
        [thirtyDaysAgo, 'completed'],
      );

      console.log('Old data cleaned up');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  /**
   * Close database
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// Singleton instance
export const homeworkModeDB = new HomeworkModeDatabase();
