import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token: string, user: User) => {
        set({ token, user });
      },

      logout: () => {
        set({ token: null, user: null });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      isAuthenticated: () => {
        return !!get().token;
      },
    }),
    {
      name: 'kanban-auth',
    }
  )
);
