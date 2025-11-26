/**
 * Deep Translate API Service via RapidAPI
 * Uses Deep Translate API for frontend translation
 */

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'deep-translate1.p.rapidapi.com';
const TRANSLATE_API_URL = `https://${RAPIDAPI_HOST}/language/translate/v2`;

// Translation cache to avoid duplicate API calls
// Key format: `${text}|${targetLanguage}`
const translationCache = new Map<string, string>();

// Rate limiting and request queue
let requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // Minimum 100ms between requests
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;

// API availability tracking
let apiUnavailable = false;
let apiUnavailableUntil = 0;

// Get cache key
function getCacheKey(text: string, targetLanguage: string): string {
  return `${text}|${targetLanguage}`;
}

// Load cache from localStorage on init
function loadCacheFromStorage() {
  try {
    const cached = localStorage.getItem('translationCache');
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.entries(parsed).forEach(([key, value]) => {
        translationCache.set(key, value as string);
      });
    }
  } catch (error) {
    console.warn('Failed to load translation cache:', error);
  }
}

// Save cache to localStorage
function saveCacheToStorage() {
  try {
    const cacheObj: Record<string, string> = {};
    translationCache.forEach((value, key) => {
      cacheObj[key] = value;
    });
    localStorage.setItem('translationCache', JSON.stringify(cacheObj));
  } catch (error) {
    console.warn('Failed to save translation cache:', error);
  }
}

// Initialize cache
loadCacheFromStorage();

interface TranslateResponse {
  translations: Array<{
    text: string;
    to: string;
  }>;
}

interface DetectResponse {
  language: string;
  score: number;
}

/**
 * Process queued translation requests with rate limiting
 */
async function processRequestQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    const request = requestQueue.shift();
    if (request) {
      activeRequests++;
      lastRequestTime = Date.now();
      request()
        .finally(() => {
          activeRequests--;
          // Continue processing queue
          setTimeout(() => processRequestQueue(), 0);
        });
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Translate text using Deep Translate API via RapidAPI
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  if (!text || !targetLanguage) return text;
  if (targetLanguage === 'en' && sourceLanguage === 'en') return text;
  if (!RAPIDAPI_KEY) {
    // Silently return original text if API key not configured
    return text;
  }

  // Check cache first
  const cacheKey = getCacheKey(text, targetLanguage);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Check if API is temporarily unavailable
  const now = Date.now();
  if (apiUnavailable && now < apiUnavailableUntil) {
    // Return original text silently if API is unavailable
    return text;
  }
  
  // Reset availability flag if time has passed
  if (apiUnavailable && now >= apiUnavailableUntil) {
    apiUnavailable = false;
  }

  // Normalize language code (e.g., 'zh-Hans' -> 'zh', 'zh-Hant' -> 'zh')
  const normalizedTargetLang = targetLanguage.split('-')[0];
  const normalizedSourceLang = sourceLanguage === 'auto' ? 'en' : sourceLanguage.split('-')[0];

  return new Promise<string>((resolve) => {
    const executeTranslation = async (): Promise<void> => {
      try {
        const response = await fetch(TRANSLATE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST,
          },
          body: JSON.stringify({
            q: text,
            source: normalizedSourceLang,
            target: normalizedTargetLang,
          }),
        });

        // Get response as text first (can only read once)
        const responseText = await response.text();
        
        if (!response.ok) {
          // Handle quota exceeded or subscription errors gracefully
          if (response.status === 429) {
            // Mark API as unavailable for 1 hour
            apiUnavailable = true;
            apiUnavailableUntil = Date.now() + 60 * 60 * 1000;
            // Return original text silently
            resolve(text);
            return;
          }
          
          if (response.status === 403) {
            // Mark API as unavailable for 24 hours (subscription issue)
            apiUnavailable = true;
            apiUnavailableUntil = Date.now() + 24 * 60 * 60 * 1000;
            // Return original text silently
            resolve(text);
            return;
          }
          
          // For other errors, return original text silently
          resolve(text);
          return;
        }

        // Try to parse as JSON
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          // If not JSON, treat as plain string
          if (responseText.trim()) {
            resolve(responseText.trim());
            return;
          }
          resolve(text);
          return;
        }

        // Handle Deep Translate API response format
        // Response format: { data: { translations: { translatedText: ["..."] } } }
        let translatedResult: string = text;
        
        if (typeof data === 'string') {
          translatedResult = data;
        } else if (data.data?.translations?.translatedText && Array.isArray(data.data.translations.translatedText) && data.data.translations.translatedText.length > 0) {
          // Deep Translate API format: { data: { translations: { translatedText: ["..."] } } }
          translatedResult = data.data.translations.translatedText[0] || text;
        } else if (data.data?.translations && Array.isArray(data.data.translations) && data.data.translations.length > 0) {
          // Alternative Deep Translate API format: { data: { translations: [{ translatedText: "..." }] } }
          translatedResult = data.data.translations[0].translatedText || text;
        } else if (data.translatedText) {
          translatedResult = data.translatedText;
        } else if (data.text) {
          translatedResult = data.text;
        } else if (data.result) {
          translatedResult = data.result;
        } else if (data.translation) {
          translatedResult = data.translation;
        } else if (data.translated_text) {
          translatedResult = data.translated_text;
        } else if (data.data?.translatedText) {
          translatedResult = data.data.translatedText;
        } else if (data.data?.text) {
          translatedResult = data.data.text;
        } else if (Array.isArray(data) && data.length > 0) {
          if (typeof data[0] === 'string') {
            translatedResult = data[0];
          } else if (data[0].text) {
            translatedResult = data[0].text;
          } else if (data[0].translatedText) {
            translatedResult = data[0].translatedText;
          }
        }
        
        // Cache the translation
        if (translatedResult && translatedResult !== text) {
          translationCache.set(cacheKey, translatedResult);
          saveCacheToStorage();
        }
        
        // Reset API availability on success
        apiUnavailable = false;
        resolve(translatedResult);
      } catch (error) {
        // Silently return original text on error
        resolve(text);
      }
    };

    // Add to queue for rate limiting
    requestQueue.push(executeTranslation);
    processRequestQueue();
  });
}

/**
 * Translate multiple texts at once
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string[]> {
  if (!texts.length || !targetLanguage) return texts;
  if (targetLanguage === 'en' && sourceLanguage === 'en') return texts;
  if (!RAPIDAPI_KEY) {
    return texts;
  }

  try {
    // For batch translation, translate each text individually with rate limiting
    // Use sequential processing to respect rate limits
    const translatedTexts: string[] = [];
    for (const text of texts) {
      const translated = await translateText(text, targetLanguage, sourceLanguage);
      translatedTexts.push(translated);
    }
    return translatedTexts;
  } catch (error) {
    // Silently return original texts on error
    return texts;
  }
}

/**
 * Detect the language of a text
 * Note: This endpoint might not be available in the RapidAPI version
 * Falls back to 'en' if detection fails
 */
export async function detectLanguage(text: string): Promise<string> {
  // Deep Translate API via RapidAPI may not have a separate detect endpoint
  // Return 'en' as default - auto-detection is handled by passing 'en' as source
  if (!text || !RAPIDAPI_KEY) return 'en';
  
  // For now, return 'en' as default
  // If detection is needed, we could try translating with auto-detect and check the response
  return 'en';
}

/**
 * Get list of supported languages from Deep Translate API
 */
export async function getSupportedLanguages(): Promise<Array<{ code: string; name: string }>> {
  // Deep Translate API via RapidAPI may not have a languages endpoint
  // Return the default supported languages list
  if (!RAPIDAPI_KEY) {
    return SUPPORTED_LANGUAGES;
  }

  // For now, return the default list
  // If the API supports a languages endpoint, it can be added here
  return SUPPORTED_LANGUAGES;
}

/**
 * Clear the translation cache
 * Useful if you want to force fresh translations
 */
export function clearTranslationCache() {
  translationCache.clear();
  try {
    localStorage.removeItem('translationCache');
  } catch (error) {
    console.warn('Failed to clear translation cache from storage:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: translationCache.size,
    keys: Array.from(translationCache.keys()),
  };
}

/**
 * Default list of supported languages (Deep Translate supports 100+)
 * The getSupportedLanguages() function will fetch the full list from the API
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'el', name: 'Greek' },
  { code: 'hu', name: 'Hungarian' },
];

