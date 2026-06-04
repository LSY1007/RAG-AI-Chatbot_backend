import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../api';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.login(email, password);
          // access_token 키로도 저장 → axios 인터셉터 & WS 재연결에서 사용
          sessionStorage.setItem('access_token', data.access_token);
          set({ token: data.access_token, user: data.user, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.detail || '로그인에 실패했습니다.', isLoading: false });
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.register(email, username, password);
          sessionStorage.setItem('access_token', data.access_token);
          set({ token: data.access_token, user: data.user, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.detail || '회원가입에 실패했습니다.', isLoading: false });
        }
      },

      logout: () => {
        sessionStorage.removeItem('access_token');
        set({ token: null, user: null, error: null });
      },

      clearError: () => set({ error: null }),

      updateUser: (partial) => {
        set((s) => ({
          user: s.user ? { ...s.user, ...partial } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // 페이지 새로고침 시 스토어 복원되면 access_token도 동기화
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          sessionStorage.setItem('access_token', state.token);
        }
      },
    }
  )
);
