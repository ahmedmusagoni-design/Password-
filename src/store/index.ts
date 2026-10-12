/**
 * Redux store configuration
 */
import { configureStore } from '@reduxjs/toolkit';
import screenTimeReducer from './slices/screenTimeSlice';
import sosReducer from './slices/sosSlice';
import authReducer from './slices/authSlice';
import appReducer from './slices/appSlice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export const store = configureStore({
  reducer: {
    screenTime: screenTimeReducer,
    sos: sosReducer,
    auth: authReducer,
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks for usage in components
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
