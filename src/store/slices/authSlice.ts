/**
 * Redux slice for authentication state
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState } from '../../types';

const initialState: AuthState = {
  userId: null,
  userType: 'child',
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login/Authentication
    setUser: (
      state,
      action: PayloadAction<{
        userId: string;
        userType: 'parent' | 'child';
      }>
    ) => {
      state.userId = action.payload.userId;
      state.userType = action.payload.userType;
      state.isAuthenticated = true;
      state.error = null;
    },

    // Logout
    clearUser: (state) => {
      state.userId = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    // Change user type
    setUserType: (state, action: PayloadAction<'parent' | 'child'>) => {
      state.userType = action.payload;
    },

    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Reset auth state
    resetAuthState: () => initialState,
  },
});

export const {
  setUser,
  clearUser,
  setUserType,
  setLoading,
  setError,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
