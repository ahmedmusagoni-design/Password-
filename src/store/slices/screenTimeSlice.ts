/**
 * Redux slice for screen time tracking state
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ScreenTimeState, DailyScreenTime, WeeklyStats, AppUsageData } from '../../types';

const initialState: ScreenTimeState = {
  dailyStats: null,
  weeklyStats: null,
  allTimeApps: [],
  loading: false,
  error: null,
  lastSync: 0,
};

export const screenTimeSlice = createSlice({
  name: 'screenTime',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Daily stats
    setDailyStats: (state, action: PayloadAction<DailyScreenTime>) => {
      state.dailyStats = action.payload;
    },

    addAppUsage: (state, action: PayloadAction<AppUsageData>) => {
      if (state.dailyStats) {
        state.dailyStats.apps.push(action.payload);
        state.dailyStats.totalDuration += action.payload.duration;
      }
    },

    // Weekly stats
    setWeeklyStats: (state, action: PayloadAction<WeeklyStats>) => {
      state.weeklyStats = action.payload;
    },

    // App history
    setAllTimeApps: (state, action: PayloadAction<AppUsageData[]>) => {
      state.allTimeApps = action.payload;
    },

    // Sync management
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Reset state
    resetScreenTimeState: () => initialState,
  },
});

export const {
  setLoading,
  setDailyStats,
  addAppUsage,
  setWeeklyStats,
  setAllTimeApps,
  setLastSync,
  setError,
  resetScreenTimeState,
} = screenTimeSlice.actions;

export default screenTimeSlice.reducer;
