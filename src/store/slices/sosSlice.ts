/**
 * Redux slice for SOS feature state
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SOSState, SOSAlert, SOSHistoryEntry } from '../../types';

const initialState: SOSState = {
  alerts: [],
  history: [],
  isSOSActive: false,
  lastSOSTime: null,
  loading: false,
  error: null,
};

export const sosSlice = createSlice({
  name: 'sos',
  initialState,
  reducers: {
    // SOS activation/deactivation
    activateSOS: (state, action: PayloadAction<SOSAlert>) => {
      state.isSOSActive = true;
      state.lastSOSTime = Date.now();
      state.alerts.push(action.payload);
    },

    deactivateSOS: (state) => {
      state.isSOSActive = false;
    },

    // Alert management
    addSOSAlert: (state, action: PayloadAction<SOSAlert>) => {
      state.alerts.push(action.payload);
    },

    updateSOSAlert: (state, action: PayloadAction<SOSAlert>) => {
      const index = state.alerts.findIndex((alert) => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = action.payload;
      }
    },

    removeSOSAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter((alert) => alert.id !== action.payload);
    },

    // History management
    addToHistory: (state, action: PayloadAction<SOSHistoryEntry>) => {
      state.history.push(action.payload);
    },

    updateHistoryEntry: (state, action: PayloadAction<SOSHistoryEntry>) => {
      const index = state.history.findIndex((entry) => entry.id === action.payload.id);
      if (index !== -1) {
        state.history[index] = action.payload;
      }
    },

    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Batch operations
    setAlerts: (state, action: PayloadAction<SOSAlert[]>) => {
      state.alerts = action.payload;
    },

    setHistory: (state, action: PayloadAction<SOSHistoryEntry[]>) => {
      state.history = action.payload;
    },

    // Reset state
    resetSOSState: () => initialState,
  },
});

export const {
  activateSOS,
  deactivateSOS,
  addSOSAlert,
  updateSOSAlert,
  removeSOSAlert,
  addToHistory,
  updateHistoryEntry,
  setLoading,
  setError,
  setAlerts,
  setHistory,
  resetSOSState,
} = sosSlice.actions;

export default sosSlice.reducer;
