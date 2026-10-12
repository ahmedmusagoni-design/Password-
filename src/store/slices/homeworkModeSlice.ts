/**
 * Redux slice for Homework Mode state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  HomeworkModeState,
  HomeworkSchedule,
  HomeworkSession,
  BlockedAppAttempt,
  BlockedApp,
} from '@/types';

const initialState: HomeworkModeState = {
  isActive: false,
  currentSession: null,
  schedules: [],
  blockedApps: [],
  recentAttempts: [],
  breakTimeAvailable: false,
  loading: false,
  error: null,
  lastSync: 0,
};

const homeworkModeSlice = createSlice({
  name: 'homeworkMode',
  initialState,
  reducers: {
    // Schedule management
    setSchedules: (state, action: PayloadAction<HomeworkSchedule[]>) => {
      state.schedules = action.payload;
    },

    addSchedule: (state, action: PayloadAction<HomeworkSchedule>) => {
      state.schedules.push(action.payload);
    },

    updateSchedule: (state, action: PayloadAction<HomeworkSchedule>) => {
      const index = state.schedules.findIndex((s) => s.id === action.payload.id);
      if (index >= 0) {
        state.schedules[index] = action.payload;
      }
    },

    removeSchedule: (state, action: PayloadAction<string>) => {
      state.schedules = state.schedules.filter((s) => s.id !== action.payload);
    },

    // Session management
    setActiveSession: (state, action: PayloadAction<HomeworkSession | null>) => {
      state.currentSession = action.payload;
      state.isActive = action.payload !== null && action.payload.status === 'active';
    },

    updateCurrentSession: (state, action: PayloadAction<Partial<HomeworkSession>>) => {
      if (state.currentSession) {
        state.currentSession = {
          ...state.currentSession,
          ...action.payload,
        };
      }
    },

    // Blocked apps
    setBlockedApps: (state, action: PayloadAction<BlockedApp[]>) => {
      state.blockedApps = action.payload;
    },

    addBlockedApp: (state, action: PayloadAction<BlockedApp>) => {
      state.blockedApps.push(action.payload);
    },

    removeBlockedApp: (state, action: PayloadAction<string>) => {
      state.blockedApps = state.blockedApps.filter((a) => a.id !== action.payload);
    },

    // App access attempts
    recordAppAttempt: (state, action: PayloadAction<BlockedAppAttempt>) => {
      state.recentAttempts.push(action.payload);
      // Keep only last 50 attempts
      if (state.recentAttempts.length > 50) {
        state.recentAttempts = state.recentAttempts.slice(-50);
      }

      if (state.currentSession) {
        state.currentSession.blockedAppAttempts.push(action.payload);
      }
    },

    updateAppAttempt: (
      state,
      action: PayloadAction<{
        attemptId: string;
        parentResponse?: 'approved' | 'denied';
        responseTime?: number;
      }>,
    ) => {
      const attempt = state.recentAttempts.find((a) => a.id === action.payload.attemptId);
      if (attempt) {
        if (action.payload.parentResponse) {
          attempt.parentResponse = action.payload.parentResponse;
        }
        if (action.payload.responseTime) {
          attempt.responseTime = action.payload.responseTime;
        }
      }

      if (state.currentSession) {
        const sessionAttempt = state.currentSession.blockedAppAttempts.find(
          (a) => a.id === action.payload.attemptId,
        );
        if (sessionAttempt && action.payload.parentResponse) {
          sessionAttempt.parentResponse = action.payload.parentResponse;
        }
        if (sessionAttempt && action.payload.responseTime) {
          sessionAttempt.responseTime = action.payload.responseTime;
        }
      }
    },

    clearAttempts: (state) => {
      state.recentAttempts = [];
      if (state.currentSession) {
        state.currentSession.blockedAppAttempts = [];
      }
    },

    // Break time
    setBreakTimeAvailable: (state, action: PayloadAction<boolean>) => {
      state.breakTimeAvailable = action.payload;
    },

    // Schedule times
    setNextScheduleTime: (
      state,
      action: PayloadAction<{
        startTime?: number;
        endTime?: number;
      }>,
    ) => {
      if (action.payload.startTime) {
        state.nextScheduleStart = action.payload.startTime;
      }
      if (action.payload.endTime) {
        state.nextScheduleEnd = action.payload.endTime;
      }
    },

    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },

    // Reset state
    resetHomeworkMode: (state) => {
      return initialState;
    },
  },
});

export const {
  setSchedules,
  addSchedule,
  updateSchedule,
  removeSchedule,
  setActiveSession,
  updateCurrentSession,
  setBlockedApps,
  addBlockedApp,
  removeBlockedApp,
  recordAppAttempt,
  updateAppAttempt,
  clearAttempts,
  setBreakTimeAvailable,
  setNextScheduleTime,
  setLoading,
  setError,
  setLastSync,
  resetHomeworkMode,
} = homeworkModeSlice.actions;

export default homeworkModeSlice.reducer;
