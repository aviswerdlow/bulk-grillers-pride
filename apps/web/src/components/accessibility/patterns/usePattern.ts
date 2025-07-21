import { useMemo } from 'react';
import { usePatternTheme } from '@/contexts/accessibility';
import { 
  getPattern, 
  getPatternUrl, 
  getPatternColors, 
  type SeverityLevel 
} from './SeverityPatterns';

export interface PatternConfig {
  patternUrl: string;
  colors: {
    primary: string;
    secondary: string;
  };
  textureDescription: string;
  severity: SeverityLevel;
  highContrast: boolean;
}

export function usePattern(severity: SeverityLevel): PatternConfig {
  const { highContrast } = usePatternTheme();

  return useMemo(() => {
    const pattern = getPattern(severity, highContrast);
    const colors = getPatternColors(severity, highContrast);
    const patternUrl = getPatternUrl(severity, highContrast);

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
export function usePatterns(severities: SeverityLevel[]): Record<SeverityLevel, PatternConfig> {
  const { highContrast } = usePatternTheme();

  return useMemo(() => {
    const configs: Partial<Record<SeverityLevel, PatternConfig>> = {};
    
    severities.forEach(severity => {
      const pattern = getPattern(severity, highContrast);
      const colors = getPatternColors(severity, highContrast);
      const patternUrl = getPatternUrl(severity, highContrast);

      configs[severity] = {
        patternUrl,
        colors,
        textureDescription: pattern.textureDescription,
        severity,
        highContrast,
      };
    });

    return configs as Record<SeverityLevel, PatternConfig>;
  }, [severities, highContrast]);
}