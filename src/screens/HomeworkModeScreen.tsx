/**
 * HomeworkModeScreen Component
 * Main screen for local study planning
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, HomeworkSchedule, HomeworkSession } from '@/types';
import {
  setActiveSession,
  setBreakTimeAvailable,
  setSchedules,
} from '@/store/slices/homeworkModeSlice';
import { homeworkModeService } from '@/services/HomeworkModeService';
import AppRestrictionsPanel from '@/components/AppRestrictionsPanel';
import ScheduleEditor from '@/components/ScheduleEditor';
import { useAppSelector } from '@/store';

interface StatusDisplayProps {
  session: HomeworkSession | null;
  isActive: boolean;
  onBreakRequest: () => void;
  breakTimeAvailable: boolean;
}

/**
 * Status Display Sub-component
 */
const StatusDisplay: React.FC<StatusDisplayProps> = ({
  session,
  isActive,
  onBreakRequest,
  breakTimeAvailable,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!isActive || !session) {
      setTimeRemaining(0);
      return;
    }

    const updateTime = () => {
      const remaining = Math.max(0, session.endTime - Date.now());
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isActive, session]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  if (!isActive) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>No active homework session</Text>
      </View>
    );
  }

  return (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>Study plan underway</Text>
      <Text style={styles.timeRemaining}>{formatTime(timeRemaining)}</Text>
      <Text style={styles.statusSubtext}>Time remaining</Text>

      <TouchableOpacity
        style={[
          styles.breakButton,
          !breakTimeAvailable && styles.breakButtonDisabled,
        ]}
        onPress={onBreakRequest}
        disabled={!breakTimeAvailable}
      >
        <Text style={styles.breakButtonText}>
          {breakTimeAvailable ? 'Request Break (5-10 min)' : 'Break Already Taken'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Main HomeworkModeScreen Component
 */
const HomeworkModeScreen: React.FC = () => {
  const dispatch = useDispatch();
  const childId = useAppSelector((state) => state.auth.userId || 'local-child');
  const {
    isActive,
    currentSession,
    schedules,
    breakTimeAvailable,
  } = useSelector((state: RootState) => state.homeworkMode);

  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  // Initialize service callbacks
  useEffect(() => {
    homeworkModeService.registerCallbacks({
      onSessionStart: (session) => {
        dispatch(setActiveSession(session));
        dispatch(setBreakTimeAvailable(true));
      },
      onSessionEnd: () => {
        dispatch(setActiveSession(null));
      },
      onBreakTimeRequested: () => {
        dispatch(setBreakTimeAvailable(false));
      },
    });
  }, [dispatch]);

  const handleCreateSchedule = () => {
    setShowScheduleEditor(true);
  };

  const handleSaveSchedule = (schedule: Omit<HomeworkSchedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = homeworkModeService.createSchedule(childId, schedule);
    dispatch(setSchedules([...schedules, created]));
    setShowScheduleEditor(false);
  };

  const handleBreakRequest = () => {
    if (!currentSession) return;

    try {
      const breakTime = homeworkModeService.requestBreakTime(
        currentSession.childId,
        5 * 60 * 1000,
      );
      if (!breakTime) {
        throw new Error('The study session is no longer active.');
      }
      Alert.alert('Break started', 'Your five-minute study break has started on this device.');
    } catch (error) {
      Alert.alert(
        'Could not start break',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const renderScheduleItem = (schedule: HomeworkSchedule) => (
    <View key={schedule.id} style={styles.scheduleItem}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>{schedule.name}</Text>
        <Text style={[
          styles.scheduleStatus,
          { color: schedule.enabled ? '#4CAF50' : '#999' },
        ]}>
          {schedule.enabled ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <Text style={styles.scheduleTime}>
        {schedule.startTime} - {schedule.endTime}
      </Text>
      <Text style={styles.scheduleDays}>
        Days: {schedule.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.disclaimer}>
        Study timers are planning tools and do not block apps. On iOS, use the Screen Time setup below to schedule restrictions for selected apps.
      </Text>

      <AppRestrictionsPanel />

      {/* Status Display */}
      <StatusDisplay
        session={currentSession}
        isActive={isActive}
        onBreakRequest={handleBreakRequest}
        breakTimeAvailable={breakTimeAvailable}
      />

      {/* Schedules Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Study schedules</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateSchedule}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {schedules.length === 0 ? (
          <Text style={styles.emptyText}>No schedules created yet</Text>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={schedules}
            renderItem={({ item }) => renderScheduleItem(item)}
            keyExtractor={(item) => item.id}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this plan does</Text>
        <Text style={styles.emptyText}>
          Study schedules and timers run on this device. Scheduled app restrictions are separate and require Screen Time authorization on iOS.
        </Text>
      </View>

      <ScheduleEditor
        visible={showScheduleEditor}
        childId={childId}
        onSave={handleSaveSchedule}
        onCancel={() => setShowScheduleEditor(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  disclaimer: {
    color: '#46585B',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Status Display
  statusContainer: {
    backgroundColor: '#1976D2',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
  },
  timeRemaining: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statusSubtext: {
    fontSize: 12,
    color: '#e0e0e0',
    marginBottom: 15,
  },
  breakButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  breakButtonDisabled: {
    backgroundColor: '#999',
  },
  breakButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },

  // Schedule Item
  scheduleItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scheduleStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  scheduleDays: {
    fontSize: 12,
    color: '#999',
  },

  // Apps Grid
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  appCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  appCategory: {
    fontSize: 11,
    color: '#999',
  },

  // Attempt Item
  attemptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  attemptApp: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  attemptTime: {
    fontSize: 11,
    color: '#999',
    marginHorizontal: 10,
  },
  attemptStatus: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Notification
  notificationContainer: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    zIndex: 1000,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 5,
  },
  blockedAppName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  notificationContent: {
    marginBottom: 15,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  timeRemainingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  requestButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty State
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default HomeworkModeScreen;
