/**
 * Redux Reducers
 * Handles state updates for monitoring and device control features
 */

import {
  MonitoringState,
  DeviceControlState,
  AppState,
} from '../types/monitoring';
import {
  MONITORING_ACTIONS,
  DEVICE_ACTIONS,
  UI_ACTIONS,
} from './actions';

// Initial state for monitoring
const initialMonitoringState: MonitoringState = {
  activities: [],
  platformStats: [],
  alerts: [],
  permissions: [],
  notificationLogs: [],
  isMonitoring: false,
  syncInProgress: false,
  lastSyncTime: undefined,
};

// Initial state for device control
const initialDeviceState: DeviceControlState = {
  schedules: [],
  controlEvents: [],
  countdownState: null,
  deviceInfo: null,
  pendingRequests: [],
  isHealthCheckScheduled: false,
};

// Initial state for UI
const initialUIState = {
  selectedPlatform: null,
  activeAlert: null,
  showCountdown: false,
};

// Initial state for errors
const initialErrorState = {
  monitoringError: null,
  controlError: null,
};

/**
 * Monitoring Reducer
 */
export function monitoringReducer(
  state: MonitoringState = initialMonitoringState,
  action: any
): MonitoringState {
  switch (action.type) {
    case MONITORING_ACTIONS.ADD_ACTIVITY:
      return {
        ...state,
        activities: [...state.activities, action.payload],
      };

    case MONITORING_ACTIONS.CLEAR_ACTIVITIES:
      return {
        ...state,
        activities: [],
      };

    case MONITORING_ACTIONS.CREATE_ALERT:
      return {
        ...state,
        alerts: [...state.alerts, action.payload],
      };

    case MONITORING_ACTIONS.ACKNOWLEDGE_ALERT:
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === action.payload.alertId
            ? {
                ...alert,
                acknowledged: true,
                actionTaken: action.payload.actionTaken,
              }
            : alert
        ),
      };

    case MONITORING_ACTIONS.CLEAR_ALERTS:
      return {
        ...state,
        alerts: [],
      };

    case MONITORING_ACTIONS.GRANT_PERMISSION:
      return {
        ...state,
        permissions: [...state.permissions, action.payload],
      };

    case MONITORING_ACTIONS.REVOKE_PERMISSION:
      return {
        ...state,
        permissions: state.permissions.filter(
          (p) => p.platform !== action.payload
        ),
      };

    case MONITORING_ACTIONS.SET_MONITORING_ACTIVE:
      return {
        ...state,
        isMonitoring: action.payload,
      };

    case MONITORING_ACTIONS.SET_SYNC_IN_PROGRESS:
      return {
        ...state,
        syncInProgress: action.payload,
      };

    case MONITORING_ACTIONS.SET_LAST_SYNC_TIME:
      return {
        ...state,
        lastSyncTime: action.payload,
      };

    case MONITORING_ACTIONS.ADD_NOTIFICATION_LOG:
      return {
        ...state,
        notificationLogs: [...state.notificationLogs, action.payload],
      };

    default:
      return state;
  }
}

/**
 * Device Control Reducer
 */
export function deviceReducer(
  state: DeviceControlState = initialDeviceState,
  action: any
): DeviceControlState {
  switch (action.type) {
    case DEVICE_ACTIONS.CREATE_SCHEDULE:
      return {
        ...state,
        schedules: [...state.schedules, action.payload],
      };

    case DEVICE_ACTIONS.UPDATE_SCHEDULE:
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.payload.id
            ? { ...schedule, ...action.payload.updates }
            : schedule
        ),
      };

    case DEVICE_ACTIONS.DELETE_SCHEDULE:
      return {
        ...state,
        schedules: state.schedules.filter((s) => s.id !== action.payload),
      };

    case DEVICE_ACTIONS.SET_SCHEDULE_ENABLED:
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.payload.id
            ? { ...schedule, enabled: action.payload.enabled }
            : schedule
        ),
      };

    case DEVICE_ACTIONS.ADD_CONTROL_EVENT:
      return {
        ...state,
        controlEvents: [...state.controlEvents, action.payload],
      };

    case DEVICE_ACTIONS.CLEAR_CONTROL_EVENTS:
      return {
        ...state,
        controlEvents: [],
      };

    case DEVICE_ACTIONS.START_COUNTDOWN:
      return {
        ...state,
        countdownState: action.payload,
      };

    case DEVICE_ACTIONS.TICK_COUNTDOWN:
      if (!state.countdownState) return state;
      return {
        ...state,
        countdownState: {
          ...state.countdownState,
          secondsRemaining: Math.max(0, state.countdownState.secondsRemaining - 1),
        },
      };

    case DEVICE_ACTIONS.CANCEL_COUNTDOWN:
      return {
        ...state,
        countdownState: null,
      };

    case DEVICE_ACTIONS.SET_DEVICE_INFO:
      return {
        ...state,
        deviceInfo: action.payload,
      };

    case DEVICE_ACTIONS.ADD_PENDING_REQUEST:
      return {
        ...state,
        pendingRequests: [...state.pendingRequests, action.payload],
      };

    case DEVICE_ACTIONS.REMOVE_PENDING_REQUEST:
      return {
        ...state,
        pendingRequests: state.pendingRequests.filter(
          (r) => r.timestamp.getTime() !== action.payload
        ),
      };

    default:
      return state;
  }
}

/**
 * UI Reducer
 */
export function uiReducer(
  state: any = initialUIState,
  action: any
): any {
  switch (action.type) {
    case UI_ACTIONS.SET_SELECTED_PLATFORM:
      return {
        ...state,
        selectedPlatform: action.payload,
      };

    case UI_ACTIONS.SET_ACTIVE_ALERT:
      return {
        ...state,
        activeAlert: action.payload,
      };

    case UI_ACTIONS.TOGGLE_COUNTDOWN_DISPLAY:
      return {
        ...state,
        showCountdown: !state.showCountdown,
      };

    default:
      return state;
  }
}

/**
 * Error Reducer
 */
export function errorReducer(
  state: any = initialErrorState,
  action: any
): any {
  switch (action.type) {
    case MONITORING_ACTIONS.SET_MONITORING_ERROR:
      return {
        ...state,
        monitoringError: action.payload,
      };

    case DEVICE_ACTIONS.SET_CONTROL_ERROR:
      return {
        ...state,
        controlError: action.payload,
      };

    default:
      return state;
  }
}

/**
 * Root Reducer
 */
export function rootReducer(
  state: AppState = {
    monitoring: initialMonitoringState,
    deviceControl: initialDeviceState,
    ui: initialUIState,
    error: initialErrorState,
  },
  action: any
): AppState {
  return {
    monitoring: monitoringReducer(state.monitoring, action),
    deviceControl: deviceReducer(state.deviceControl, action),
    ui: uiReducer(state.ui, action),
    error: errorReducer(state.error, action),
  };
}
