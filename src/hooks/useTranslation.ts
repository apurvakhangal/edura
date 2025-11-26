import { useState, useEffect, useCallback } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { translateText, translateBatch } from '@/services/translateService';

/**
 * Hook for translating text based on current language setting
 */
export function useTranslation() {
  const { language } = useThemeStore();
  const [isTranslating, setIsTranslating] = useState(false);

  const t = useCallback(
    async (text: string): Promise<string> => {
      if (!text || language === 'en') return text;
      if (isTranslating) return text;

      setIsTranslating(true);
      try {
        const translated = await translateText(text, language);
        return translated;
      } catch (error) {
        console.error('Translation error:', error);
        return text;
      } finally {
        setIsTranslating(false);
      }
    },
    [language, isTranslating]
  );

  const translateMultiple = useCallback(
    async (texts: string[]): Promise<string[]> => {
      if (!texts.length || language === 'en') return texts;

      setIsTranslating(true);
      try {
        const translated = await translateBatch(texts, language);
        return translated;
      } catch (error) {
        console.error('Translation error:', error);
        return texts;
      } finally {
        setIsTranslating(false);
      }
    },
    [language]
  );

  return { t, translateMultiple, isTranslating, currentLanguage: language };
}

/**
 * Hook for translating component text with caching
 * Uses debouncing to prevent excessive API calls
 */
export function useTranslatedText(originalText: string): string {
  const { language } = useThemeStore();
  const [translatedText, setTranslatedText] = useState(originalText);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!originalText || language === 'en') {
      setTranslatedText(originalText);
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    // Increased debounce delay to reduce API calls and respect rate limits
    const timeoutId = setTimeout(() => {
      translateText(originalText, language)
        .then((translated) => {
          if (!cancelled) {
            setTranslatedText(translated);
            setIsTranslating(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            // On error, keep original text but mark as not translating
            setTranslatedText(originalText);
            setIsTranslating(false);
          }
        });
    }, 300); // Increased delay to batch requests and reduce API calls

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      setIsTranslating(false);
    };
  }, [originalText, language]);

  return translatedText;
}

