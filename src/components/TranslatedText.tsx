import { useState, useEffect } from 'react';
import { useTranslatedText } from '@/hooks/useTranslation';
import { useThemeStore } from '@/store/themeStore';
import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TranslatedTextProps {
  text: string;
  showError?: boolean;
  className?: string;
}

/**
 * Enhanced TranslatedText component that shows errors for untranslated text
 */
export function TranslatedText({ text, showError = true, className }: TranslatedTextProps) {
  const { language } = useThemeStore();
  const translated = useTranslatedText(text);
  const [showErrorState, setShowErrorState] = useState(false);
  
  // Wait a bit before showing error to allow async translation to complete
  useEffect(() => {
    if (language === 'en' || !showError) {
      setShowErrorState(false);
      return;
    }
    
    // Wait 2 seconds before showing error (to allow translation to complete)
    const timer = setTimeout(() => {
      // If translated equals original after delay, likely failed
      if (translated === text) {
        setShowErrorState(true);
      } else {
        setShowErrorState(false);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [translated, text, language, showError]);
  
  // Check if translation actually happened
  const isTranslated = language === 'en' || translated !== text;
  const isError = showErrorState && !isTranslated && language !== 'en';

  if (isError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 ${className}`}>
              <span className="text-red-500 underline decoration-dotted">{text}</span>
              <AlertCircle className="h-3 w-3 text-red-500" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>This text has not been translated yet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className={className}>{translated}</span>;
}

