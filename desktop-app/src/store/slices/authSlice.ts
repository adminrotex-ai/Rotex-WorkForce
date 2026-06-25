import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
}

const saved = localStorage.getItem('jobwork_auth');
const initial: AuthState = saved
  ? JSON.parse(saved)
  : { currentUser: null, isAuthenticated: false };

const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    login(state, action: PayloadAction<User>) {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('jobwork_auth', JSON.stringify(state));
    },
    logout(state) {
      state.currentUser = null;
      state.isAuthenticated = false;
      localStorage.removeItem('jobwork_auth');
    },
    setUser(state, action: PayloadAction<User>) {
      state.currentUser = action.payload;
      localStorage.setItem('jobwork_auth', JSON.stringify(state));
    },
  },
});

export const { login, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
