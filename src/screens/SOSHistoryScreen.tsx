/**
 * SOS History Screen
 * Displays past SOS alerts and their status
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { setHistory, setLoading, setError } from '../store/slices/sosSlice';
import { sosAlertService } from '../services/SOSAlertService';
import { formatDate } from '../utils/helpers';

interface SOSHistoryItem {
  id: string;
  timestamp: number;
  childName: string;
  reason: string;
  status: 'sent' | 'failed' | 'acknowledged';
  location?: {
    latitude: number;
    longitude: number;
  };
}

const SOSHistoryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { history, loading, error } = useAppSelector((state) => state.sos);
  const [refreshing, setRefreshing] = useState(false);
  const [sosAlerts, setSOSAlerts] = useState<SOSHistoryItem[]>([]);

  useEffect(() => {
    loadSOSHistory();
  }, []);

  /**
   * Load SOS history
   */
  const loadSOSHistory = async () => {
    try {
      dispatch(setLoading(true));

      const alerts = await sosAlertService.getAllSOSAlerts();
      const historyItems: SOSHistoryItem[] = alerts.map((alert) => ({
        id: alert.id,
        timestamp: alert.timestamp,
        childName: alert.childName,
        reason: alert.reason,
        status: alert.status,
        location: alert.location,
      }));

      setSOSAlerts(historyItems);
      dispatch(setError(null));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load SOS history';
      dispatch(setError(errorMessage));
      console.error('Error loading SOS history:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSOSHistory();
    setRefreshing(false);
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return '#4ECDC4';
      case 'sent':
        return '#FFA500';
      case 'failed':
        return '#FF6B6B';
      default:
        return '#999';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return '✓';
      case 'sent':
        return '→';
      case 'failed':
        return '✕';
      default:
        return '?';
    }
  };

  /**
   * Render SOS history item
   */
  const renderHistoryItem = ({ item }: { item: SOSHistoryItem }) => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString();
    const dateStr = formatDate(date);

    return (
      <TouchableOpacity style={styles.historyCard} activeOpacity={0.7}>
        {/* Status indicator */}
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.childName}>{item.childName}</Text>
            <Text style={styles.status}>{item.status.toUpperCase()}</Text>
          </View>

          <Text style={styles.reason}>{item.reason}</Text>

          <View style={styles.meta}>
            <Text style={styles.metaText}>{dateStr}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>{timeStr}</Text>
          </View>

          {item.location && (
            <Text style={styles.location}>
              📍 {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading && sosAlerts.length === 0) {
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

  return (
    <View style={styles.container}>
      {sosAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🆘</Text>
          <Text style={styles.emptyTitle}>No SOS Alerts</Text>
          <Text style={styles.emptyText}>You haven't sent any SOS alerts yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sosAlerts}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  status: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
  },
  reason: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
  },
  location: {
    fontSize: 11,
    color: '#4ECDC4',
    marginTop: 6,
  },
  arrow: {
    fontSize: 20,
    color: '#CCC',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SOSHistoryScreen;
