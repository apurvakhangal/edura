import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'colorblind' | 'dyslexia';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface ThemeState {
  mode: ThemeMode;
  isDyslexia: boolean;
  isColorblind: boolean;
  language: string;
  fontSize: FontSize;
  setMode: (mode: ThemeMode) => void;
  toggleDyslexia: () => void;
  toggleColorblind: () => void;
  setLanguage: (lang: string) => void;
  setFontSize: (size: FontSize) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      isDyslexia: false,
      isColorblind: false,
      language: 'en',
      fontSize: 'medium',
      setMode: (mode) => set({ mode }),
      toggleDyslexia: () => set((state) => ({ isDyslexia: !state.isDyslexia })),
      toggleColorblind: () => set((state) => ({ isColorblind: !state.isColorblind })),
      setLanguage: (lang) => set({ language: lang }),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: 'edura-theme',
    }
  )
);
