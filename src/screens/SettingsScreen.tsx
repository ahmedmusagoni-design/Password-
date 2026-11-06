/**
 * Settings Screen
 * App settings and configuration
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch } from '../store';
import { clearUser } from '../store/slices/authSlice';
import { screenTimeTrackerService } from '../services/ScreenTimeTrackerService';
import { sosAlertService } from '../services/SOSAlertService';
import { clearDatabase } from '../utils/database';
import { parentApi } from '../services/ParentApi';

const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: () => {
          void parentApi.signOut().then(() => {
            dispatch(clearUser());
          }).catch((error: unknown) => {
            Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Please try again.');
          });
        },
        style: 'destructive',
      },
    ]);
  };

  /**
   * Handle clear data
   */
  const handleClearData = () => {
    Alert.alert(
      'Clear Data',
      'This removes screen-time and SOS history stored on this device only. It does not delete family-server data. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await screenTimeTrackerService.clearAllData();
              await sosAlertService.clearAllData();
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  /**
   * Handle reset database
   */
  const handleResetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'This resets the database on this device only. It does not delete family-server data. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await clearDatabase();
              Alert.alert('Success', 'Database has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset database.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family alerts</Text>
        <Text style={styles.settingDesc}>
          SOS and screen-time alerts appear in the family dashboard when the device is connected.
          Push delivery is not configured.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.settingDesc}>
          Location permission is requested only when a child sends an SOS alert. Sharing coordinates is optional.
        </Text>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>0.1.0</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>1</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Environment</Text>
          <Text style={styles.infoValue}>{parentApi.isConfigured ? 'API configured' : 'API not configured'}</Text>
        </View>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <Text style={styles.dangerButtonText}>Clear on-device history</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleResetDatabase}>
          <Text style={styles.dangerButtonText}>Reset local database</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Parental Control</Text>
        <Text style={styles.footerText}>Family data stays limited to summaries and SOS alerts.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  settingLabel: {
    flex: 1,
  },
  settingName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  infoLabel: {
    fontSize: 15,
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});

export default SettingsScreen;
