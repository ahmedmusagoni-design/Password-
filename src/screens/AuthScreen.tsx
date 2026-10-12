/**
 * Auth Screen
 * Login/authentication screen for the app
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAppDispatch } from '../store';
import { setUser } from '../store/slices/authSlice';
import { generateId } from '../utils/helpers';

const AuthScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [userType, setUserType] = useState<'parent' | 'child'>('child');

  /**
   * Handle login
   */
  const handleLogin = (type: 'parent' | 'child') => {
    const userId = generateId();
    dispatch(
      setUser({
        userId,
        userType: type,
      })
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.title}>Parental Control</Text>
          <Text style={styles.subtitle}>Child Safety & Screen Time Monitoring</Text>
        </View>

        {/* User Type Selection */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Who are you?</Text>

          {/* Child Login */}
          <TouchableOpacity
            style={[
              styles.userTypeCard,
              userType === 'child' && styles.userTypeCardActive,
            ]}
            onPress={() => setUserType('child')}
          >
            <Text style={styles.userTypeIcon}>👶</Text>
            <Text style={styles.userTypeName}>Child</Text>
            <Text style={styles.userTypeDesc}>Access your screen time</Text>
          </TouchableOpacity>

          {/* Parent Login */}
          <TouchableOpacity
            style={[
              styles.userTypeCard,
              userType === 'parent' && styles.userTypeCardActive,
            ]}
            onPress={() => setUserType('parent')}
          >
            <Text style={styles.userTypeIcon}>👨‍👩‍👧</Text>
            <Text style={styles.userTypeName}>Parent</Text>
            <Text style={styles.userTypeDesc}>Monitor your children</Text>
          </TouchableOpacity>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featureTitle}>Features:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>📊</Text>
              <Text style={styles.featureText}>Real-time screen time tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>🆘</Text>
              <Text style={styles.featureText}>Emergency SOS alerts with location</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>📈</Text>
              <Text style={styles.featureText}>Weekly usage trends and insights</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>🔔</Text>
              <Text style={styles.featureText}>Smart notifications and alerts</Text>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => handleLogin(userType)}
          >
            <Text style={styles.loginButtonText}>
              Continue as {userType === 'child' ? 'Child' : 'Parent'}
            </Text>
          </TouchableOpacity>

          {/* Demo Info */}
          <View style={styles.demoInfo}>
            <Text style={styles.demoText}>
              This is a demo. Using mock data for development and testing.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  userTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#EFEFEF',
    alignItems: 'center',
  },
  userTypeCardActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#F0FFFE',
  },
  userTypeIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  userTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userTypeDesc: {
    fontSize: 12,
    color: '#999',
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureBullet: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  loginButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  demoInfo: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  demoText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
});

export default AuthScreen;
