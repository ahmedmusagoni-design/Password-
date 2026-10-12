/**
 * Device Shutdown Control UI Component
 * Displays shutdown schedules, countdown timer, and control history
 */

import React from 'react';
import {
  ShutdownSchedule,
  DeviceControlEvent,
  CountdownState,
  DeviceInfo,
} from '../types/monitoring';

interface DeviceControlScreenProps {
  schedules: ShutdownSchedule[];
  controlEvents: DeviceControlEvent[];
  countdownState: CountdownState | null;
  deviceInfo: DeviceInfo | null;
  onCreateSchedule: (schedule: Omit<ShutdownSchedule, 'id'>) => void;
  onUpdateSchedule: (id: string, updates: Partial<ShutdownSchedule>) => void;
  onDeleteSchedule: (id: string) => void;
  onTriggerRemoteShutdown: (action: 'shutdown' | 'restart' | 'lock') => void;
  onCancelCountdown: () => void;
  onTriggerEmergencyOverride: () => void;
}

/**
 * Shutdown Schedule Editor Component
 * Create and manage shutdown schedules
 */
export const ScheduleEditor: React.FC<{
  onCreateSchedule: (schedule: Omit<ShutdownSchedule, 'id'>) => void;
}> = ({ onCreateSchedule }) => {
  const [weekday, setWeekday] = React.useState(0);
  const [hour, setHour] = React.useState(22);
  const [minute, setMinute] = React.useState(0);
  const [gracePeriod, setGracePeriod] = React.useState(5);
  const [recurring, setRecurring] = React.useState(true);
  const [emergencyOverride, setEmergencyOverride] = React.useState(true);

  const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSchedule({
      weekday,
      hour,
      minute,
      enabled: true,
      recurring,
      timezone: 'UTC',
      gracePeriod,
      emergencyOverrideEnabled: emergencyOverride,
    });
  };

  return (
    <div className="schedule-editor">
      <h3>Create New Schedule</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Day of Week</label>
          <select value={weekday} onChange={(e) => setWeekday(parseInt(e.target.value))}>
            {weekdays.map((day, idx) => (
              <option key={idx} value={idx}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hour</label>
            <input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Minute</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Grace Period (minutes)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={gracePeriod}
            onChange={(e) => setGracePeriod(parseInt(e.target.value))}
          />
          <small>Time to allow before forced shutdown</small>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Recurring Weekly
          </label>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={emergencyOverride}
              onChange={(e) => setEmergencyOverride(e.target.checked)}
            />
            Allow Emergency Override
          </label>
        </div>

        <button type="submit" className="btn btn-primary">
          Create Schedule
        </button>
      </form>
    </div>
  );
};

/**
 * Schedule List Component
 * Display all shutdown schedules
 */
export const ScheduleList: React.FC<{
  schedules: ShutdownSchedule[];
  onUpdate: (id: string, updates: Partial<ShutdownSchedule>) => void;
  onDelete: (id: string) => void;
}> = ({ schedules, onUpdate, onDelete }) => {
  const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  return (
    <div className="schedule-list">
      <h3>Active Schedules ({schedules.length})</h3>
      {schedules.length === 0 ? (
        <p>No schedules configured</p>
      ) : (
        <div className="schedules-container">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-info">
                <h4>{weekdays[schedule.weekday]}</h4>
                <div className="time">
                  {String(schedule.hour).padStart(2, '0')}:
                  {String(schedule.minute).padStart(2, '0')}
                </div>
                <div className="details">
                  <span>Grace: {schedule.gracePeriod} min</span>
                  {schedule.emergencyOverrideEnabled && (
                    <span className="badge">🚨 Override OK</span>
                  )}
                </div>
              </div>
              <div className="schedule-controls">
                <button
                  onClick={() => onUpdate(schedule.id, { enabled: !schedule.enabled })}
                  className={`btn-toggle ${schedule.enabled ? 'active' : 'inactive'}`}
                >
                  {schedule.enabled ? '✓ On' : '✗ Off'}
                </button>
                <button
                  onClick={() => onDelete(schedule.id)}
                  className="btn-delete"
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Countdown Display Component
 * Shows active countdown timer
 */
export const CountdownDisplay: React.FC<{
  countdownState: CountdownState | null;
  onCancel?: () => void;
  onEmergencyOverride?: () => void;
}> = ({ countdownState, onCancel, onEmergencyOverride }) => {
  if (!countdownState || !countdownState.active) {
    return null;
  }

  const minutes = Math.floor(countdownState.secondsRemaining / 60);
  const seconds = countdownState.secondsRemaining % 60;

  return (
    <div className="countdown-overlay">
      <div className="countdown-panel">
        <h2>⚠️ Device Shutdown</h2>
        <div className="countdown-timer">
          <div className="time">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p>Device will shutdown in {minutes} minute(s)</p>
        </div>

        <div className="countdown-actions">
          {countdownState.cancellable && onCancel && (
            <button onClick={onCancel} className="btn btn-warning">
              ⏸ Cancel Countdown
            </button>
          )}
          {onEmergencyOverride && (
            <button onClick={onEmergencyOverride} className="btn btn-danger">
              🚨 Emergency Override
            </button>
          )}
        </div>

        <div className="countdown-info">
          <small>Action: {countdownState.action}</small>
        </div>
      </div>
    </div>
  );
};

/**
 * Device Control Panel Component
 * Remote control buttons for parent app
 */
export const DeviceControlPanel: React.FC<{
  onShutdown: () => void;
  onRestart: () => void;
  onLock: () => void;
  deviceInfo: DeviceInfo | null;
}> = ({ onShutdown, onRestart, onLock, deviceInfo }) => {
  const health = deviceInfo?.healthCheck;

  return (
    <div className="device-control-panel">
      <h3>Device Control</h3>

      {deviceInfo && (
        <div className="device-status">
          <div className="status-item">
            <span>Device:</span>
            <strong>{deviceInfo.deviceName}</strong>
          </div>
          <div className="status-item">
            <span>Status:</span>
            <strong className={health?.online ? 'online' : 'offline'}>
              {health?.online ? '🟢 Online' : '🔴 Offline'}
            </strong>
          </div>
          {health?.batteryLevel !== undefined && (
            <div className="status-item">
              <span>Battery:</span>
              <strong>{Math.round(health.batteryLevel)}%</strong>
            </div>
          )}
          {health?.storageSpace !== undefined && (
            <div className="status-item">
              <span>Storage:</span>
              <strong>{Math.round(health.storageSpace)}%</strong>
            </div>
          )}
        </div>
      )}

      <div className="control-buttons">
        <button onClick={onLock} className="btn btn-lock">
          🔒 Lock
        </button>
        <button onClick={onShutdown} className="btn btn-shutdown">
          📴 Shutdown
        </button>
        <button onClick={onRestart} className="btn btn-restart">
          🔄 Restart
        </button>
      </div>
    </div>
  );
};

/**
 * Control History Component
 * Display shutdown and control events
 */
export const ControlHistory: React.FC<{ events: DeviceControlEvent[] }> = ({
  events,
}) => {
  const recentEvents = events.slice(-10).reverse();

  return (
    <div className="control-history">
      <h3>Control History</h3>
      {recentEvents.length === 0 ? (
        <p>No events yet</p>
      ) : (
        <div className="events-list">
          {recentEvents.map((event) => (
            <div key={event.id} className={`event-item ${event.success ? 'success' : 'failed'}`}>
              <div className="event-header">
                <span className="action">{event.action.toUpperCase()}</span>
                <span className="timestamp">{event.timestamp.toLocaleString()}</span>
              </div>
              <div className="event-details">
                <span className="reason">{event.reason}</span>
                <span className={`status ${event.success ? 'success' : 'failed'}`}>
                  {event.success ? '✓ Success' : '✗ Failed'}
                </span>
              </div>
              {event.errorMessage && (
                <div className="error-message">{event.errorMessage}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main Device Control Screen Component
 */
export const DeviceControlScreen: React.FC<DeviceControlScreenProps> = ({
  schedules,
  controlEvents,
  countdownState,
  deviceInfo,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onTriggerRemoteShutdown,
  onCancelCountdown,
  onTriggerEmergencyOverride,
}) => {
  return (
    <div className="device-control-screen">
      <header>
        <h1>Device Shutdown Control</h1>
      </header>

      <CountdownDisplay
        countdownState={countdownState}
        onCancel={onCancelCountdown}
        onEmergencyOverride={onTriggerEmergencyOverride}
      />

      <div className="control-sections">
        <div className="section">
          <ScheduleEditor onCreateSchedule={onCreateSchedule} />
          <ScheduleList
            schedules={schedules}
            onUpdate={onUpdateSchedule}
            onDelete={onDeleteSchedule}
          />
        </div>

        <div className="section">
          <DeviceControlPanel
            onShutdown={() => onTriggerRemoteShutdown('shutdown')}
            onRestart={() => onTriggerRemoteShutdown('restart')}
            onLock={() => onTriggerRemoteShutdown('lock')}
            deviceInfo={deviceInfo}
          />
          <ControlHistory events={controlEvents} />
        </div>
      </div>
    </div>
  );
};

export default DeviceControlScreen;
