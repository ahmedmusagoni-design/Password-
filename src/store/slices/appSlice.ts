/**
 * Redux slice for app-level state
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppState, LocationData } from '../../types';

const initialState: AppState = {
  isOnline: true,
  backgroundServiceRunning: false,
  currentLocation: undefined,
  lastLocationUpdate: 0,
  appVersion: '0.1.0',
  deviceId: '',
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Network status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    // Background service
    setBackgroundServiceRunning: (state, action: PayloadAction<boolean>) => {
      state.backgroundServiceRunning = action.payload;
    },

    // Location management
    setCurrentLocation: (state, action: PayloadAction<LocationData>) => {
      state.currentLocation = action.payload;
      state.lastLocationUpdate = Date.now();
    },

    clearLocation: (state) => {
      state.currentLocation = undefined;
    },

    // Device info
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },

    setAppVersion: (state, action: PayloadAction<string>) => {
      state.appVersion = action.payload;
    },

    // Reset app state
    resetAppState: () => initialState,
  },
});

export const {
  setOnlineStatus,
  setBackgroundServiceRunning,
  setCurrentLocation,
  clearLocation,
  setDeviceId,
  setAppVersion,
  resetAppState,
} = appSlice.actions;

export default appSlice.reducer;
