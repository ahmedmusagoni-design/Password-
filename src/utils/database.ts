/**
 * Database initialization and schema
 */
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('parental_control.db');

export const initializeDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // App Usage Table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS app_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_name TEXT NOT NULL,
          package_name TEXT NOT NULL,
          duration INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          category TEXT,
          date_str TEXT NOT NULL,
          uploaded BOOLEAN DEFAULT 0
        );`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      // Daily Stats Cache Table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS daily_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          total_duration INTEGER NOT NULL,
          last_updated INTEGER NOT NULL
        );`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      // SOS Alerts Table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sos_alerts (
          id TEXT PRIMARY KEY,
          child_id TEXT NOT NULL,
          child_name TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          latitude REAL,
          longitude REAL,
          accuracy REAL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3
        );`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      // SOS History Table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sos_history (
          id TEXT PRIMARY KEY,
          alert_id TEXT NOT NULL,
          parent_notified BOOLEAN DEFAULT 0,
          parent_response_time INTEGER,
          notes TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(alert_id) REFERENCES sos_alerts(id)
        );`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      // Sync Queue Table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          retry_count INTEGER DEFAULT 0
        );`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      // Indexes for performance
      tx.executeSql(
        `CREATE INDEX IF NOT EXISTS idx_app_usage_date ON app_usage(date_str);`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      tx.executeSql(
        `CREATE INDEX IF NOT EXISTS idx_app_usage_timestamp ON app_usage(timestamp);`,
        [],
        () => {},
        (_, error) => reject(error)
      );

      tx.executeSql(
        `CREATE INDEX IF NOT EXISTS idx_sos_timestamp ON sos_alerts(timestamp);`,
        [],
        () => {},
        (_, error) => reject(error)
      );
    }, reject, resolve);
  });
};

export const clearDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql('DELETE FROM app_usage;', [], () => {}, (_, error) => reject(error));
      tx.executeSql('DELETE FROM daily_stats;', [], () => {}, (_, error) => reject(error));
      tx.executeSql('DELETE FROM sos_alerts;', [], () => {}, (_, error) => reject(error));
      tx.executeSql('DELETE FROM sos_history;', [], () => {}, (_, error) => reject(error));
      tx.executeSql('DELETE FROM sync_queue;', [], () => {}, (_, error) => reject(error));
    }, reject, resolve);
  });
};
