/**
 * SOS Alert Service
 * Handles emergency alerts and notifications
 */
import { logger } from '../utils/logger';
import { SOSAlert, SOSHistoryEntry, LocationData } from '../types';
import { generateId } from '../utils/helpers';
import { db } from '../utils/database';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parentApi } from './ParentApi';

const SOS_QUEUE_KEY = 'sos_alert_queue';
const MAX_RETRIES = 3;

export class SOSAlertService {
  /**
   * Initialize SOS service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing SOSAlertService');
      
      logger.info('SOSAlertService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SOSAlertService', error);
      throw error;
    }
  }

  /**
   * Trigger SOS alert
   */
  public async triggerSOS(reason: string, childId: string = 'child-001'): Promise<SOSAlert> {
    try {
      logger.info('Triggering SOS alert');

      // Get current location
      const location = await this.getCurrentLocation();

      // Create SOS alert
      const sosAlert: SOSAlert = {
        id: generateId(),
        childId,
        childName: 'Child Name', // TODO: Get from state
        timestamp: Date.now(),
        location,
        reason,
        status: 'sent',
        retryCount: 0,
        maxRetries: MAX_RETRIES,
      };

      // Save to database
      await this.saveSosAlert(sosAlert);

      // Send to parents
      try {
        await this.sendAlertToParents(sosAlert);
      } catch (error) {
        logger.error('Failed to send SOS alert to parents', error);
        sosAlert.status = 'failed';
        await this.updateSosAlert(sosAlert);
      }

      // Add to queue for retry
      await this.addToSyncQueue(sosAlert);

      return sosAlert;
    } catch (error) {
      logger.error('Failed to trigger SOS alert', error);
      throw error;
    }
  }

  /**
   * Get current location
   */
  private async getCurrentLocation(): Promise<LocationData | undefined> {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return undefined;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        altitude: location.coords.altitude || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      logger.warn('Failed to get location for SOS alert', error);
      return undefined;
    }
  }

  /**
   * Send alert to parents
   */
  private async sendAlertToParents(sosAlert: SOSAlert): Promise<void> {
    await parentApi.sendSosAlert(sosAlert.location);
    sosAlert.status = 'sent';
    logger.info('SOS alert submitted to the family API');
  }

  /**
   * Save SOS alert to database
   */
  private async saveSosAlert(sosAlert: SOSAlert): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO sos_alerts 
           (id, child_id, child_name, timestamp, latitude, longitude, accuracy, reason, status, retry_count, max_retries)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sosAlert.id,
            sosAlert.childId,
            sosAlert.childName,
            sosAlert.timestamp,
            sosAlert.location?.latitude || null,
            sosAlert.location?.longitude || null,
            sosAlert.location?.accuracy || null,
            sosAlert.reason,
            sosAlert.status,
            sosAlert.retryCount,
            sosAlert.maxRetries,
          ],
          () => {
            logger.debug('SOS alert saved to database');
            resolve();
          },
          (_, error) => {
            logger.error('Failed to save SOS alert', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Update SOS alert status
   */
  private async updateSosAlert(sosAlert: SOSAlert): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `UPDATE sos_alerts 
           SET status = ?, retry_count = ?, latitude = ?, longitude = ?, accuracy = ?
           WHERE id = ?`,
          [
            sosAlert.status,
            sosAlert.retryCount,
            sosAlert.location?.latitude || null,
            sosAlert.location?.longitude || null,
            sosAlert.location?.accuracy || null,
            sosAlert.id,
          ],
          () => resolve(),
          (_, error) => {
            logger.error('Failed to update SOS alert', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Add alert to sync queue for retry logic
   */
  private async addToSyncQueue(sosAlert: SOSAlert): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        alertId: sosAlert.id,
        retries: 0,
      });
      await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      logger.error('Failed to add SOS alert to sync queue', error);
    }
  }

  /**
   * Get sync queue
   */
  private async getSyncQueue(): Promise<any[]> {
    try {
      const queue = await AsyncStorage.getItem(SOS_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      logger.error('Failed to get sync queue', error);
      return [];
    }
  }

  /**
   * Retry failed SOS alerts
   */
  public async retryFailedAlerts(): Promise<void> {
    try {
      logger.info('Retrying failed SOS alerts');

      const failedAlerts = await this.getFailedAlerts();

      for (const alert of failedAlerts) {
        if (alert.retryCount < alert.maxRetries) {
          try {
            await this.sendAlertToParents(alert);
            alert.retryCount++;
            await this.updateSosAlert(alert);
          } catch (error) {
            logger.warn(`Failed to retry SOS alert ${alert.id}`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error during retry failed alerts', error);
    }
  }

  /**
   * Get failed alerts from database
   */
  private async getFailedAlerts(): Promise<SOSAlert[]> {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM sos_alerts WHERE status = 'failed' AND retry_count < max_retries`,
          [],
          (_, result) => {
            const alerts: SOSAlert[] = result.rows._array.map((row: any) => ({
              id: row.id,
              childId: row.child_id,
              childName: row.child_name,
              timestamp: row.timestamp,
              location: row.latitude
                ? {
                    latitude: row.latitude,
                    longitude: row.longitude,
                    accuracy: row.accuracy,
                  }
                : undefined,
              reason: row.reason,
              status: row.status,
              retryCount: row.retry_count,
              maxRetries: row.max_retries,
            }));
            resolve(alerts);
          },
          (_, error) => {
            logger.error('Failed to get failed alerts', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get SOS alert by ID
   */
  public async getSOSAlertById(id: string): Promise<SOSAlert | null> {
    try {
      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT * FROM sos_alerts WHERE id = ?`,
            [id],
            (_, result) => {
              if (result.rows.length === 0) {
                resolve(null);
              } else {
                const row = result.rows._array[0];
                const alert: SOSAlert = {
                  id: row.id,
                  childId: row.child_id,
                  childName: row.child_name,
                  timestamp: row.timestamp,
                  location: row.latitude
                    ? {
                          latitude: row.latitude,
                          longitude: row.longitude,
                          accuracy: row.accuracy,
                        }
                    : undefined,
                  reason: row.reason,
                  status: row.status,
                  retryCount: row.retry_count,
                  maxRetries: row.max_retries,
                };
                resolve(alert);
              }
            },
            (_, error) => {
              logger.error('Failed to get SOS alert by ID', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error getting SOS alert by ID', error);
      throw error;
    }
  }

  /**
   * Get all SOS alerts
   */
  public async getAllSOSAlerts(): Promise<SOSAlert[]> {
    try {
      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT * FROM sos_alerts ORDER BY timestamp DESC`,
            [],
            (_, result) => {
              const alerts: SOSAlert[] = result.rows._array.map((row: any) => ({
                id: row.id,
                childId: row.child_id,
                childName: row.child_name,
                timestamp: row.timestamp,
                location: row.latitude
                    ? {
                        latitude: row.latitude,
                        longitude: row.longitude,
                        accuracy: row.accuracy,
                    }
                  : undefined,
                reason: row.reason,
                status: row.status,
                retryCount: row.retry_count,
                maxRetries: row.max_retries,
              }));
              resolve(alerts);
            },
            (_, error) => {
              logger.error('Failed to get all SOS alerts', error);
              reject(error);
              return false;
            }
          );
        });
      });
    } catch (error) {
      logger.error('Error getting all SOS alerts', error);
      throw error;
    }
  }

  /**
   * Add entry to SOS history
   */
  public async addToHistory(entry: SOSHistoryEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO sos_history (id, alert_id, parent_notified, parent_response_time, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            entry.id,
            entry.alert.id,
            entry.parentNotified ? 1 : 0,
            entry.parentResponseTime || null,
            entry.notes || null,
            Date.now(),
          ],
          () => resolve(),
          (_, error) => {
            logger.error('Failed to add to SOS history', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Clear all SOS data
   */
  public async clearAllData(): Promise<void> {
    try {
      logger.warn('Clearing all SOS data');
      return new Promise((resolve, reject) => {
        db.transaction((tx) => {
          tx.executeSql('DELETE FROM sos_alerts;', []);
          tx.executeSql(
            'DELETE FROM sos_history;',
            [],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            },
          );
        });
      });
    } catch (error) {
      logger.error('Error clearing SOS data', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sosAlertService = new SOSAlertService();
