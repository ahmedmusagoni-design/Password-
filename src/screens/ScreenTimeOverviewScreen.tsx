/**
 * Screen Time Overview Screen
 * Displays daily usage stats and alerts
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { setDailyStats, setLoading, setError } from '../store/slices/screenTimeSlice';
import { generateMockDailyStats } from '../utils/mockData';
import { formatDuration, formatDate } from '../utils/helpers';
import { screenTimeTrackerService } from '../services/ScreenTimeTrackerService';

const ScreenTimeOverviewScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { dailyStats, loading, error } = useAppSelector((state) => state.screenTime);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDailyStats();
  }, []);

  /**
   * Load today's screen time stats
   */
  const loadDailyStats = async () => {
    try {
      dispatch(setLoading(true));
      
      // Try to get real data from tracker
      const apps = await screenTimeTrackerService.getTodayUsage();
      
      // For demo purposes, generate mock data
      const mockData = generateMockDailyStats(new Date());
      
      dispatch(setDailyStats(mockData));
      dispatch(setError(null));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load screen time data';
      dispatch(setError(errorMessage));
      console.error('Error loading daily stats:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDailyStats();
    setRefreshing(false);
  };

  if (loading && !dailyStats) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!dailyStats) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No screen time data available</Text>
      </View>
    );
  }

  const totalMinutes = Math.floor(dailyStats.totalDuration / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.date}>{formatDate(new Date())}</Text>
        <View style={styles.totalTimeContainer}>
          <Text style={styles.totalTimeLabel}>Total Screen Time</Text>
          <Text style={styles.totalTime}>
            {hours}h {minutes}m
          </Text>
        </View>
      </View>

      {/* Alerts Section */}
      {dailyStats.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          {dailyStats.alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                {
                  borderLeftColor:
                    alert.type === 'critical'
                      ? '#FF6B6B'
                      : alert.type === 'warning'
                      ? '#FFA500'
                      : '#4ECDC4',
                },
              ]}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>{alert.type.toUpperCase()}</Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Apps Section */}
      <View style={styles.topAppsSection}>
        <Text style={styles.sectionTitle}>Top Apps Today</Text>
        {dailyStats.apps.slice(0, 5).map((app, index) => (
          <View key={index} style={styles.appRow}>
            <View style={styles.appInfo}>
              <Text style={styles.appName}>{app.appName}</Text>
              <Text style={styles.appDuration}>{formatDuration(app.duration)}</Text>
            </View>
            <View style={styles.appBar}>
              <View
                style={[
                  styles.appBarFill,
                  {
                    width: `${(app.duration / dailyStats.totalDuration) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Summary Section */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Apps Used</Text>
          <Text style={styles.summaryValue}>{dailyStats.apps.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Most Used</Text>
          <Text style={styles.summaryValue}>
            {dailyStats.apps.length > 0 ? dailyStats.apps[0].appName : 'N/A'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  totalTimeContainer: {
    alignItems: 'center',
  },
  totalTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  alertsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
  },
  alertTime: {
    fontSize: 10,
    color: '#999',
  },
  alertMessage: {
    fontSize: 13,
    color: '#555',
  },
  topAppsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appInfo: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  appDuration: {
    fontSize: 12,
    color: '#999',
  },
  appBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EFEFEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  appBarFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 3,
  },
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ScreenTimeOverviewScreen;
