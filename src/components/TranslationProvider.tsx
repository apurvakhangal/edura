import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { translateText } from '@/services/translateService';

/**
 * Translation Provider Component
 * Automatically translates page content when language changes
 */
export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { language } = useThemeStore();

  useEffect(() => {
    // When language changes, trigger a re-render to update translations
    // This is handled by individual components using the useTranslation hook
    if (language !== 'en') {
      // Force a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Translations will be handled by components using useTranslation hook
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [language]);

  return <>{children}</>;
}

/**
 * Helper function to translate text in components
 */
export async function translateContent(text: string, targetLang: string): Promise<string> {
  if (!text || targetLang === 'en') return text;
  return await translateText(text, targetLang);
}

