/**
 * Main Tab Navigator
 * Bottom tab navigation for the app
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import ScreenTimeOverviewScreen from '../screens/ScreenTimeOverviewScreen';
import SOSHistoryScreen from '../screens/SOSHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SOSButton from '../components/SOSButton';

const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#CCC',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EFEFEF',
          paddingBottom: 8,
        },
      }}
    >
      {/* Screen Time Tab */}
      <Tab.Screen
        name="ScreenTime"
        component={ScreenTimeOverviewScreen}
        options={{
          title: 'Screen Time',
          tabBarLabel: 'Screen Time',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📊</Text>
          ),
          headerTitle: 'Screen Time Tracking',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            color: '#333',
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      />

      {/* SOS Tab */}
      <Tab.Screen
        name="SOS"
        component={View}
        options={{
          title: 'SOS',
          tabBarLabel: 'Emergency',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🆘</Text>
          ),
          headerTitle: 'Emergency SOS',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            color: '#333',
            fontSize: 18,
            fontWeight: '600',
          },
          tabBarButton: (props) => (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <SOSButton />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />

      {/* History Tab */}
      <Tab.Screen
        name="SOSHistory"
        component={SOSHistoryScreen}
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📋</Text>
          ),
          headerTitle: 'SOS History',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            color: '#333',
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      />

      {/* Settings Tab */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⚙️</Text>
          ),
          headerTitle: 'Settings',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            color: '#333',
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
