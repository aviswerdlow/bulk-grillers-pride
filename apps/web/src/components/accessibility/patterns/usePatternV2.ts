import { useMemo } from 'react';
import { 
  getPatternV2, 
  getPatternUrlV2, 
  getPatternColorsV2, 
  type SeverityLevel 
} from './SeverityPatternsV2';

export interface PatternConfigV2 {
  patternUrl: string;
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  textureDescription: string;
  severity: SeverityLevel;
  highContrast: boolean;
}

// Check for high contrast mode preference
function useHighContrastMode() {
  // For now, we'll check for prefers-contrast media query
  // In a real app, this might come from a context or user preference
  if (typeof window === 'undefined') return false;
  
  try {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    return mediaQuery.matches;
  } catch {
    // For testing environments where matchMedia might not be available
    return false;
  }
}

export function usePatternV2(severity: SeverityLevel): PatternConfigV2 {
  const highContrast = useHighContrastMode();

  return useMemo(() => {
    const pattern = getPatternV2(severity);
    const colors = getPatternColorsV2(severity);
    const patternUrl = getPatternUrlV2(severity);

    return {
      patternUrl,
      colors,
      textureDescription: pattern.textureDescription,
      severity,
      highContrast,
    };
  }, [severity, highContrast]);
}

// Batch hook for multiple severities
export function usePatternsV2(severities: SeverityLevel[]): Record<SeverityLevel, PatternConfigV2> {
  const highContrast = useHighContrastMode();

  return useMemo(() => {
    const configs: Partial<Record<SeverityLevel, PatternConfigV2>> = {};
    
    severities.forEach(severity => {
      const pattern = getPatternV2(severity);
      const colors = getPatternColorsV2(severity);
      const patternUrl = getPatternUrlV2(severity);

      configs[severity] = {
        patternUrl,
        colors,
        textureDescription: pattern.textureDescription,
        severity,
        highContrast,
      };
    });

    return configs as Record<SeverityLevel, PatternConfigV2>;
  }, [severities, highContrast]);
}