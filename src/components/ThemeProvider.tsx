import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, isDyslexia, isColorblind } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'colorblind', 'dyslexia');
    
    // Add current mode
    root.classList.add(mode);
    
    // Add accessibility modes
    if (isDyslexia) {
      root.classList.add('dyslexia');
    }
    
    if (isColorblind) {
      root.classList.add('colorblind');
    }
  }, [mode, isDyslexia, isColorblind]);

  return <>{children}</>;
}
