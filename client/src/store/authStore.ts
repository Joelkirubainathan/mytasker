import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, isAuthenticated: true, isLoading: false });
      },

      setUser: (user) => set({ user }),

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {/* ignore */}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      initialize: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data, isAuthenticated: true, accessToken: token, isLoading: false });
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'mytasker-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
