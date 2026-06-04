import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from './api';

interface User { id: number; email: string; username: string; is_admin: boolean; profile_image?: string | null; }

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null, user: null, isLoading: false, error: null, isInitialized: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const userStr = await SecureStore.getItemAsync('user_data');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch { set({ isInitialized: true }); }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login(email, password);
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail || '로그인에 실패했습니다.', isLoading: false });
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.register(email, username, password);
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail || '회원가입에 실패했습니다.', isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_data');
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));
