/**
 * Main App Component
 * Entry point for the application with Redux provider and navigation setup
 */
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { store } from './store';
import { initializeDatabase } from './utils/database';
import { screenTimeTrackerService } from './services/ScreenTimeTrackerService';
import { sosAlertService } from './services/SOSAlertService';
import { logger } from './utils/logger';
import MainTabNavigator from './navigation/MainTabNavigator';
import AuthScreen from './screens/AuthScreen';

const Stack = createNativeStackNavigator();

const RootNavigator: React.FC = () => {
  const isAuthenticated = false; // TODO: Get from Redux auth state

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{
            animationEnabled: false,
          }}
        />
      ) : (
        <Stack.Screen
          name="MainApp"
          component={MainTabNavigator}
          options={{
            animationEnabled: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize application
   */
  const initializeApp = async () => {
    try {
      logger.info('Initializing application');

      // Initialize database
      await initializeDatabase();
      logger.info('Database initialized');

      // Initialize screen time tracker
      await screenTimeTrackerService.initialize();
      await screenTimeTrackerService.startTracking();
      logger.info('Screen time tracker initialized and started');

      // Initialize SOS service
      await sosAlertService.initialize();
      logger.info('SOS service initialized');

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', error);
    }
  };

  return (
    <Provider store={store}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
