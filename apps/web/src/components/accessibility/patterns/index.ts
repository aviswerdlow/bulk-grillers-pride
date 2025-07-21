export {
  PatternDefs,
  patterns,
  getPattern,
  getPatternUrl,
  getPatternColors,
  type SeverityLevel,
  type PatternDefinition,
} from './SeverityPatterns';

export {
  usePattern,
  usePatterns,
  type PatternConfig,
} from './usePattern';

export {
  SeverityIndicator,
  SeverityIndicatorWithIcon,
  SeverityIndicatorGroup,
  type SeverityIndicatorProps,
} from './SeverityIndicator';

// Enhanced version with label and message props
export {
  SeverityIndicatorEnhanced,
  InfoIndicator,
  WarningIndicator,
  DangerIndicator,
  CriticalIndicator,
  type SeverityIndicatorEnhancedProps,
} from './SeverityIndicatorEnhanced';

// V2 Pattern definitions with exact design colors
export {
  PatternDefsV2,
  patterns as patternsV2,
  getPatternV2,
  getPatternUrlV2,
  getPatternColorsV2,
} from './SeverityPatternsV2';

export {
  usePatternV2,
  usePatternsV2,
  type PatternConfigV2,
} from './usePatternV2';