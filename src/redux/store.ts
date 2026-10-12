/**
 * Redux Store Configuration
 * Creates and exports the Redux store with proper middleware setup
 */

import { createStore, combineReducers, applyMiddleware, Store } from 'redux';
import { rootReducer } from './reducers';
import { AppState } from '../types/monitoring';

/**
 * Logger middleware - logs all actions and state changes
 */
function loggerMiddleware(store: any) {
  return (next: any) => (action: any) => {
    console.log('[Redux] Action:', action.type);
    if (action.payload) {
      console.log('[Redux] Payload:', action.payload);
    }
    const result = next(action);
    console.log('[Redux] New state:', store.getState());
    return result;
  };
}

/**
 * Error middleware - catches and logs errors
 */
function errorMiddleware(store: any) {
  return (next: any) => (action: any) => {
    try {
      return next(action);
    } catch (error) {
      console.error('[Redux] Error:', error);
      throw error;
    }
  };
}

/**
 * Create and configure the Redux store
 */
export function createAppStore(): Store<AppState> {
  const store = createStore(
    rootReducer,
    applyMiddleware(loggerMiddleware, errorMiddleware)
  );

  return store;
}

// Export singleton store instance
export const appStore = createAppStore();

/**
 * Get current state (for direct access without selectors)
 */
export function getAppState(): AppState {
  return appStore.getState();
}

/**
 * Subscribe to state changes
 */
export function subscribeToStateChanges(
  listener: (state: AppState) => void
): () => void {
  return appStore.subscribe(() => {
    listener(appStore.getState());
  });
}

export default appStore;
