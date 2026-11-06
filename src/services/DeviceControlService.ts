/**
 * Device Control Service
 * Manages device shutdown scheduling, remote control, and health monitoring
 * Handles graceful shutdown with countdown, emergency overrides, and logging
 */

import {
  ShutdownSchedule,
  DeviceControlEvent,
  CountdownState,
  DeviceControlAction,
  ShutdownReason,
  HealthCheckStatus,
  DeviceInfo,
  RemoteShutdownRequest,
} from '../types/monitoring';

export class DeviceControlService {
  private schedules: ShutdownSchedule[] = [];
  private controlEvents: DeviceControlEvent[] = [];
  private countdownState: CountdownState | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private pendingRequests: RemoteShutdownRequest[] = [];
  private countdownInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isLocked: boolean = false;

  // Emergency override patterns to detect
  private readonly BYPASS_ATTEMPTS = ['adb', 'disable', 'uninstall', 'force', 'recovery'];

  constructor() {
    this.initializeDevice();
  }

  /**
   * Initialize device information
   */
  private initializeDevice(): void {
    this.deviceInfo = {
      deviceId: `device-${Date.now()}`,
      deviceName: 'Child Device',
      osType: 'android',
      osVersion: '13.0',
      appVersion: '1.0.0',
      lastSyncTime: new Date(),
      healthCheck: {
        lastCheck: new Date(),
        online: true,
        appVersion: '1.0.0',
        osVersion: '13.0',
        batteryLevel: 85,
        storageSpace: 45,
      },
    };
  }

  /**
   * Create a new shutdown schedule
   */
  createSchedule(schedule: Omit<ShutdownSchedule, 'id'>): ShutdownSchedule {
    const newSchedule: ShutdownSchedule = {
      ...schedule,
      id: `schedule-${Date.now()}`,
    };

    this.schedules.push(newSchedule);
    console.log(`✓ Schedule created: ${newSchedule.hour}:${String(newSchedule.minute).padStart(2, '0')}`);
    return newSchedule;
  }

  /**
   * Update an existing schedule
   */
  updateSchedule(id: string, updates: Partial<ShutdownSchedule>): ShutdownSchedule | null {
    const schedule = this.schedules.find((s) => s.id === id);
    if (!schedule) {
      console.error(`Schedule ${id} not found`);
      return null;
    }

    Object.assign(schedule, updates);
    console.log(`✓ Schedule ${id} updated`);
    return schedule;
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: string): boolean {
    const index = this.schedules.findIndex((s) => s.id === id);
    if (index === -1) {
      console.error(`Schedule ${id} not found`);
      return false;
    }

    this.schedules.splice(index, 1);
    console.log(`✓ Schedule ${id} deleted`);
    return true;
  }

  /**
   * Get all schedules
   */
  getSchedules(): ShutdownSchedule[] {
    return [...this.schedules];
  }

  /**
   * Enable/disable a schedule
   */
  setScheduleEnabled(id: string, enabled: boolean): void {
    const schedule = this.schedules.find((s) => s.id === id);
    if (schedule) {
      schedule.enabled = enabled;
      console.log(`Schedule ${id} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if any schedules should trigger
   */
  checkSchedules(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    for (const schedule of this.schedules) {
      if (!schedule.enabled) continue;

      // Check if schedule matches current time
      if (schedule.hour === currentHour && schedule.minute === currentMinute) {
        if (!schedule.recurring || schedule.weekday === currentDay) {
          this.initiateShutdown('scheduled', schedule.gracePeriod);
        }
      }
    }
  }

  /**
   * Request remote shutdown from parent device
   */
  async processRemoteRequest(request: RemoteShutdownRequest): Promise<boolean> {
    console.log(`📱 Remote ${request.action} requested by parent`);
    
    this.pendingRequests.push(request);

    try {
      if (request.requiresConfirmation) {
        console.log('⏳ Awaiting child device confirmation...');
        // In real app, this would wait for user confirmation
        // For now, simulate user confirming after 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Check for emergency override if this is a shutdown
      if (request.action === 'shutdown') {
        const schedule = this.schedules.find((s) => s.emergencyOverrideEnabled && s.enabled);
        if (schedule) {
          console.log('🚨 Emergency override is available');
        }
      }

      await this.executeControl(request.action, request.reason, 'parent');
      return true;
    } catch (error) {
      console.error('✗ Failed to execute remote request:', error);
      return false;
    }
  }

  /**
   * Initiate shutdown with countdown
   */
  private initiateShutdown(reason: ShutdownReason, gracePeriodMinutes: number = 1): void {
    const countdownSeconds = gracePeriodMinutes * 60;

    console.log(`⏱️ Shutdown initiated (reason: ${reason}, ${gracePeriodMinutes} minute grace period)`);

    this.countdownState = {
      active: true,
      secondsRemaining: countdownSeconds,
      action: 'shutdown',
      cancellable: reason !== 'scheduled' || !this.isScheduledShutdown(reason),
      countdownStartedAt: new Date(),
    };

    this.startCountdown();
  }

  /**
   * Start countdown timer
   */
  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      if (!this.countdownState) {
        clearInterval(this.countdownInterval!);
        return;
      }

      this.countdownState.secondsRemaining--;

      if (this.countdownState.secondsRemaining <= 0) {
        clearInterval(this.countdownInterval!);
        this.executeControl(
          this.countdownState.action,
          'scheduled',
          'system'
        ).catch((error) => console.error('Shutdown failed:', error));
      } else if (this.countdownState.secondsRemaining % 60 === 0) {
        const minutesRemaining = Math.ceil(this.countdownState.secondsRemaining / 60);
        console.log(`⏱️ ${minutesRemaining} minute(s) until ${this.countdownState.action}...`);
      }
    }, 1000);
  }

  /**
   * Cancel active countdown (if cancellable)
   */
  cancelCountdown(): boolean {
    if (!this.countdownState || !this.countdownState.cancellable) {
      console.log('❌ Cannot cancel this countdown');
      return false;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    console.log('✓ Countdown cancelled');
    this.countdownState = null;
    return true;
  }

  /**
   * Trigger emergency override (only available if enabled)
   */
  triggerEmergencyOverride(): boolean {
    const schedule = this.schedules.find((s) => s.emergencyOverrideEnabled && s.enabled);
    
    if (!schedule) {
      console.log('❌ Emergency override not available');
      return false;
    }

    if (this.cancelCountdown()) {
      console.log('🚨 Emergency override activated');
      return true;
    }

    return false;
  }

  /**
   * Get current countdown state
   */
  getCountdownState(): CountdownState | null {
    return this.countdownState ? { ...this.countdownState } : null;
  }

  /**
   * Execute device control action
   */
  private async executeControl(
    action: DeviceControlAction,
    reason: ShutdownReason,
    initiatedBy: 'parent' | 'schedule' | 'system'
  ): Promise<void> {
    console.log(`Executing action: ${action} (reason: ${reason})`);

    const event: DeviceControlEvent = {
      id: `event-${Date.now()}`,
      action,
      reason,
      timestamp: new Date(),
      initiatedBy,
      scheduled: reason === 'scheduled',
      success: false,
    };

    try {
      // Simulate actual device control (in real app, calls native APIs)
      // Check for bypass attempts
      this.detectBypassAttempts();

      // Perform the action
      switch (action) {
        case 'shutdown':
          console.log('📴 Device shutting down...');
          break;
        case 'restart':
          console.log('🔄 Device restarting...');
          break;
        case 'lock':
          console.log('🔒 Device locked');
          this.isLocked = true;
          break;
        case 'unlock':
          console.log('🔓 Device unlocked');
          this.isLocked = false;
          break;
      }

      event.success = true;
      event.completedAt = new Date();
      console.log(`✓ Action completed successfully`);
    } catch (error) {
      event.success = false;
      event.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`✗ Action failed: ${event.errorMessage}`);
    }

    this.controlEvents.push(event);
  }

  /**
   * Detect attempted bypass/uninstall
   */
  private detectBypassAttempts(): void {
    // In real app, monitor for suspicious activities
    // For now, just log that we're checking
    const suspiciousPatterns = this.BYPASS_ATTEMPTS.filter((pattern) =>
      // Check logs or recent activity (simplified)
      false // Replace with actual detection logic
    );

    if (suspiciousPatterns.length > 0) {
      console.warn(`⚠️ Potential bypass attempt detected: ${suspiciousPatterns.join(', ')}`);
    }
  }

  /**
   * Check if this is a scheduled shutdown (recurring or emergency)
   */
  private isScheduledShutdown(reason: ShutdownReason): boolean {
    return reason === 'scheduled' || reason === 'bedtime';
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMinutes: number = 5): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log(`Starting health checks every ${intervalMinutes} minute(s)`);

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMinutes * 60 * 1000);

    // Perform initial check
    this.performHealthCheck();
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Health checks stopped');
    }
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    if (!this.deviceInfo) return;

    this.deviceInfo.healthCheck = {
      lastCheck: new Date(),
      online: true, // Would actually check connectivity
      appVersion: this.deviceInfo.appVersion,
      osVersion: this.deviceInfo.osVersion,
      batteryLevel: Math.random() * 100,
      storageSpace: Math.random() * 100,
    };

    this.deviceInfo.lastSyncTime = new Date();
    console.log('✓ Health check completed');
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo ? { ...this.deviceInfo } : null;
  }

  /**
   * Get control events (shutdown/restart history)
   */
  getControlEvents(): DeviceControlEvent[] {
    return [...this.controlEvents];
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): RemoteShutdownRequest[] {
    return [...this.pendingRequests];
  }

  /**
   * Clear pending request after processing
   */
  clearPendingRequest(requestId: string): void {
    this.pendingRequests = this.pendingRequests.filter((r) => r.timestamp.getTime() !== requestId);
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.schedules = [];
    this.controlEvents = [];
    this.countdownState = null;
    this.pendingRequests = [];
    this.isLocked = false;

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.initializeDevice();
  }
}

// Export singleton instance
export const deviceControlService = new DeviceControlService();
