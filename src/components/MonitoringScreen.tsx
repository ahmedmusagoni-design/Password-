/**
 * Social Media Monitoring UI Component
 * Displays activity feed, platform stats, alerts, and risk detection
 */

import React from 'react';
import {
  SocialMediaActivity,
  ActivityAlert,
  PlatformStats,
  NotificationLog,
} from '../types/monitoring';

interface MonitoringScreenProps {
  activities: SocialMediaActivity[];
  alerts: ActivityAlert[];
  platformStats: PlatformStats[];
  notificationLogs: NotificationLog[];
  isMonitoring: boolean;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  onAcknowledgeAlert: (alertId: string, actionTaken?: string) => void;
  selectedPlatform: string | null;
  onSelectPlatform: (platform: string | null) => void;
}

/**
 * Activity Feed Component
 * Shows chronological list of social media activities
 */
export const ActivityFeed: React.FC<{ activities: SocialMediaActivity[] }> = ({
  activities,
}) => {
  return (
    <div className="activity-feed">
      <h2>Activity Feed</h2>
      <div className="activities-container">
        {activities.length === 0 ? (
          <p>No activities recorded</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`activity-item risk-${activity.riskLevel}`}
            >
              <div className="activity-header">
                <span className="platform">{activity.platform}</span>
                <span className="timestamp">
                  {activity.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="activity-content">
                <p>{activity.description}</p>
                {activity.duration && (
                  <span className="duration">{activity.duration} min</span>
                )}
              </div>
              <div className={`risk-badge risk-${activity.riskLevel}`}>
                {activity.riskLevel}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Platform Stats Component
 * Displays time spent and engagement stats per platform
 */
export const PlatformStatsPanel: React.FC<{ stats: PlatformStats[] }> = ({
  stats,
}) => {
  return (
    <div className="platform-stats">
      <h2>Platform Statistics</h2>
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.platform} className="stat-card">
            <h3>{stat.platform.toUpperCase()}</h3>
            <div className="stat-row">
              <span>Time Spent:</span>
              <strong>{Math.round(stat.totalTimeSpent)} minutes</strong>
            </div>
            <div className="stat-row">
              <span>Activities:</span>
              <strong>{stat.activitiesCount}</strong>
            </div>
            <div className="stat-row">
              <span>Risk Count:</span>
              <strong className="risk-badge">{stat.riskCount}</strong>
            </div>
            {stat.followerCount !== undefined && (
              <div className="stat-row">
                <span>Followers:</span>
                <strong>{stat.followerCount}</strong>
              </div>
            )}
            <div className="stat-row">
              <span>Last Activity:</span>
              <small>{stat.lastActivityTime.toLocaleTimeString()}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Alerts Dashboard Component
 * Shows detected risky activities and alerts
 */
export const AlertsDashboard: React.FC<{
  alerts: ActivityAlert[];
  onAcknowledge: (alertId: string, action?: string) => void;
}> = ({ alerts, onAcknowledge }) => {
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  return (
    <div className="alerts-dashboard">
      <h2>Risk Alerts</h2>

      <div className="alerts-summary">
        <div className="alert-badge high">
          {alerts.filter((a) => a.riskLevel === 'high').length} High Risk
        </div>
        <div className="alert-badge medium">
          {alerts.filter((a) => a.riskLevel === 'medium').length} Medium Risk
        </div>
      </div>

      {unacknowledgedAlerts.length > 0 && (
        <div className="unacknowledged-alerts">
          <h3>Pending ({unacknowledgedAlerts.length})</h3>
          {unacknowledgedAlerts.map((alert) => (
            <div key={alert.id} className={`alert risk-${alert.riskLevel}`}>
              <div className="alert-header">
                <span className="platform">{alert.platform}</span>
                <span className="timestamp">
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p>{alert.description}</p>
              <div className="alert-keywords">
                {alert.keywords.map((keyword) => (
                  <span key={keyword} className="keyword-tag">
                    {keyword}
                  </span>
                ))}
              </div>
              <button
                onClick={() => onAcknowledge(alert.id, 'Acknowledged')}
                className="acknowledge-btn"
              >
                Acknowledge & Notify Parent
              </button>
            </div>
          ))}
        </div>
      )}

      {acknowledgedAlerts.length > 0 && (
        <div className="acknowledged-alerts">
          <h3>Resolved ({acknowledgedAlerts.length})</h3>
          <div className="alerts-list">
            {acknowledgedAlerts.slice(-5).map((alert) => (
              <div key={alert.id} className="alert-item resolved">
                <span>{alert.description}</span>
                <span className="action">{alert.actionTaken}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Monitoring Control Component
 * Start/stop monitoring, select platforms
 */
export const MonitoringControl: React.FC<{
  isMonitoring: boolean;
  selectedPlatform: string | null;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  onSelectPlatform: (platform: string | null) => void;
}> = ({
  isMonitoring,
  selectedPlatform,
  onStartMonitoring,
  onStopMonitoring,
  onSelectPlatform,
}) => {
  const platforms = ['instagram', 'tiktok', 'snapchat', 'twitter', 'youtube'];

  return (
    <div className="monitoring-control">
      <h2>Monitoring Control</h2>

      <div className="control-buttons">
        {!isMonitoring ? (
          <button onClick={onStartMonitoring} className="btn btn-primary">
            ▶ Start Monitoring
          </button>
        ) : (
          <button onClick={onStopMonitoring} className="btn btn-danger">
            ⏹ Stop Monitoring
          </button>
        )}
      </div>

      <div className="status">
        Status: <strong>{isMonitoring ? '🟢 Active' : '🔴 Inactive'}</strong>
      </div>

      <div className="platform-filter">
        <h3>Filter by Platform</h3>
        <div className="platform-buttons">
          <button
            onClick={() => onSelectPlatform(null)}
            className={`platform-btn ${selectedPlatform === null ? 'active' : ''}`}
          >
            All
          </button>
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => onSelectPlatform(platform)}
              className={`platform-btn ${selectedPlatform === platform ? 'active' : ''}`}
            >
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Main Monitoring Screen Component
 */
export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({
  activities,
  alerts,
  platformStats,
  notificationLogs,
  isMonitoring,
  onStartMonitoring,
  onStopMonitoring,
  onAcknowledgeAlert,
  selectedPlatform,
  onSelectPlatform,
}) => {
  const filteredActivities = selectedPlatform
    ? activities.filter((a) => a.platform === selectedPlatform)
    : activities;

  return (
    <div className="monitoring-screen">
      <header>
        <h1>Social Media Monitoring</h1>
      </header>

      <MonitoringControl
        isMonitoring={isMonitoring}
        selectedPlatform={selectedPlatform}
        onStartMonitoring={onStartMonitoring}
        onStopMonitoring={onStopMonitoring}
        onSelectPlatform={onSelectPlatform}
      />

      <AlertsDashboard alerts={alerts} onAcknowledge={onAcknowledgeAlert} />

      <PlatformStatsPanel stats={platformStats} />

      <ActivityFeed activities={filteredActivities} />
    </div>
  );
};

export default MonitoringScreen;
