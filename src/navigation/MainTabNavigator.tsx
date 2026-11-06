import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAppSelector } from '../store';
import ChildRequestsScreen from '../screens/ChildRequestsScreen';
import HomeworkModeScreen from '../screens/HomeworkModeScreen';
import ParentDashboardScreen from '../screens/ParentDashboardScreen';
import ScreenTimeOverviewScreen from '../screens/ScreenTimeOverviewScreen';
import SOSHistoryScreen from '../screens/SOSHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SOSButton from '../components/SOSButton';

const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC = () => {
  const userType = useAppSelector((state) => state.auth.userType);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#167E78',
        tabBarInactiveTintColor: '#708082',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#D5DEDE',
          paddingBottom: 8,
        },
      }}
    >
      {userType === 'parent' ? (
        <>
          <Tab.Screen
            name="Dashboard"
            component={ParentDashboardScreen}
            options={{
              title: 'Family',
              tabBarLabel: 'Family',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text>,
            }}
          />
          <Tab.Screen
            name="ParentSettings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙</Text>,
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="ScreenTime"
            component={ScreenTimeOverviewScreen}
            options={{
              title: 'Screen Time',
              tabBarLabel: 'Today',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◷</Text>,
            }}
          />
          <Tab.Screen
            name="StudyPlan"
            component={HomeworkModeScreen}
            options={{
              title: 'Study plan',
              tabBarLabel: 'Study',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◫</Text>,
            }}
          />
          <Tab.Screen
            name="Requests"
            component={ChildRequestsScreen}
            options={{
              title: 'Parent requests',
              tabBarLabel: 'Requests',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>↔</Text>,
            }}
          />
          <Tab.Screen
            name="SOS"
            component={View}
            options={{
              title: 'Emergency SOS',
              tabBarLabel: 'SOS',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>SOS</Text>,
              tabBarButton: (props) => (
                <View
                  accessibilityRole="button"
                  accessibilityLabel="Send an emergency SOS"
                  style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                  <SOSButton />
                  {props.children}
                </View>
              ),
            }}
            listeners={{
              tabPress: (event) => event.preventDefault(),
            }}
          />
          <Tab.Screen
            name="SOSHistory"
            component={SOSHistoryScreen}
            options={{
              title: 'SOS history',
              tabBarLabel: 'History',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>▤</Text>,
            }}
          />
          <Tab.Screen
            name="ChildSettings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙</Text>,
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
