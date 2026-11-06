/**
 * Main App Component
 * Entry point for the application with Redux provider and navigation setup
 */
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { store, useAppSelector } from './store';
import { initializeDatabase } from './utils/database';
import { sosAlertService } from './services/SOSAlertService';
import { logger } from './utils/logger';
import MainTabNavigator from './navigation/MainTabNavigator';
import AuthScreen from './screens/AuthScreen';
import { setUser } from './store/slices/authSlice';
import { parentApi } from './services/ParentApi';

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

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

      // Initialize SOS service
      await sosAlertService.initialize();
      logger.info('SOS service initialized');

      const user = await parentApi.restoreSession();
      if (user) {
        store.dispatch(setUser({ userId: user.id, userType: user.role }));
      }

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
