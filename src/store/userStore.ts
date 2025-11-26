import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  isAuthenticated: boolean;
  user: {
    name: string;
    email: string;
    xp: number;
    level: number;
    streak: number;
  } | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  addXP: (amount: number) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: (email, name) =>
        set({
          isAuthenticated: true,
          user: { name, email, xp: 0, level: 1, streak: 0 },
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
        }),
      addXP: (amount) =>
        set((state) => {
          if (!state.user) return state;
          const newXP = state.user.xp + amount;
          const newLevel = Math.floor(newXP / 100) + 1;
          return {
            user: {
              ...state.user,
              xp: newXP,
              level: newLevel,
            },
          };
        }),
    }),
    {
      name: 'edura-user',
    }
  )
);
