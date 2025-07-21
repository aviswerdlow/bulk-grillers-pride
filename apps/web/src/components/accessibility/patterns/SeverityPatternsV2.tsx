'use client';

import React from 'react';

export type SeverityLevel = 'info' | 'warning' | 'danger' | 'critical';

export interface PatternDefinition {
  id: string;
  name: string;
  severity: SeverityLevel;
  svgPattern: React.ReactElement;
  highContrastVariant: React.ReactElement;
  colorScheme: {
    primary: string;
    secondary: string;
    text: string;
    highContrast: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
  textureDescription: string;
}

// Pattern definitions matching the exact design specifications
const patterns: Record<SeverityLevel, PatternDefinition> = {
  info: {
    id: 'pattern-info',
    name: 'Information',
    severity: 'info',
    svgPattern: (
      <pattern id="pattern-info" patternUnits="userSpaceOnUse" width="16" height="16">
        <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.3"/>
        <circle cx="10" cy="6" r="1" fill="currentColor" opacity="0.3"/>
        <circle cx="6" cy="10" r="1" fill="currentColor" opacity="0.3"/>
        <circle cx="14" cy="14" r="1" fill="currentColor" opacity="0.3"/>
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-info-hc" patternUnits="userSpaceOnUse" width="16" height="16">
        <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
        <circle cx="10" cy="6" r="1.5" fill="currentColor"/>
        <circle cx="6" cy="10" r="1.5" fill="currentColor"/>
        <circle cx="14" cy="14" r="1.5" fill="currentColor"/>
      </pattern>
    ),
    colorScheme: {
      primary: '#2563EB', // Blue
      secondary: '#DBEAFE', // Light Blue
      text: '#1E40AF', // Dark Blue for text
      highContrast: {
        primary: '#000000',
        secondary: '#FFFFFF',
        text: '#000000',
      },
    },
    textureDescription: 'Sparse dot pattern indicating low severity information',
  },
  warning: {
    id: 'pattern-warning',
    name: 'Warning',
    severity: 'warning',
    svgPattern: (
      <pattern id="pattern-warning" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0,8 L8,0" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-warning-hc" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0,8 L8,0" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M-4,4 L4,-4" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M4,12 L12,4" stroke="currentColor" strokeWidth="2.5"/>
      </pattern>
    ),
    colorScheme: {
      primary: '#F59E0B', // Yellow
      secondary: '#FEF3C7', // Light Yellow
      text: '#92400E', // Dark Yellow for text (meets contrast)
      highContrast: {
        primary: '#000000',
        secondary: '#FFFFFF',
        text: '#000000',
      },
    },
    textureDescription: 'Diagonal stripe pattern indicating medium severity warning',
  },
  danger: {
    id: 'pattern-danger',
    name: 'Danger',
    severity: 'danger',
    svgPattern: (
      <pattern id="pattern-danger" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0,0 L8,8 M8,0 L0,8" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-danger-hc" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0,0 L8,8 M8,0 L0,8" stroke="currentColor" strokeWidth="2"/>
      </pattern>
    ),
    colorScheme: {
      primary: '#EF4444', // Red
      secondary: '#FEE2E2', // Light Red
      text: '#B91C1C', // Dark Red for text
      highContrast: {
        primary: '#000000',
        secondary: '#FFFFFF',
        text: '#000000',
      },
    },
    textureDescription: 'Cross-hatch pattern indicating high severity danger',
  },
  critical: {
    id: 'pattern-critical',
    name: 'Critical',
    severity: 'critical',
    svgPattern: (
      <pattern id="pattern-critical" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect x="0" y="0" width="4" height="4" fill="currentColor" opacity="0.7"/>
        <rect x="4" y="4" width="4" height="4" fill="currentColor" opacity="0.7"/>
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-critical-hc" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect x="0" y="0" width="4" height="4" fill="currentColor"/>
        <rect x="4" y="4" width="4" height="4" fill="currentColor"/>
        <rect x="0" y="4" width="4" height="4" fill="white"/>
        <rect x="4" y="0" width="4" height="4" fill="white"/>
      </pattern>
    ),
    colorScheme: {
      primary: '#991B1B', // Dark Red
      secondary: '#FCA5A5', // Light Red
      text: '#FFFFFF', // White text on dark background
      highContrast: {
        primary: '#000000',
        secondary: '#FFFFFF', 
        text: '#000000',
      },
    },
    textureDescription: 'Dense checkerboard pattern indicating critical severity',
  },
};

// SVG Pattern Provider Component
export function PatternDefsV2({ highContrast = false }: { highContrast?: boolean }) {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute' }}
      aria-hidden="true"
    >
      <defs>
        {Object.values(patterns).map((pattern) => (
          <React.Fragment key={pattern.id}>
            {highContrast ? pattern.highContrastVariant : pattern.svgPattern}
          </React.Fragment>
        ))}
      </defs>
    </svg>
  );
}

// Export pattern definitions
export { patterns };

// Utility function to get pattern by severity
export function getPatternV2(severity: SeverityLevel, highContrast = false): PatternDefinition {
  const pattern = patterns[severity];
  if (!pattern) {
    console.warn(`Unknown severity level: ${severity}`);
    return patterns.info; // Default fallback
  }
  return pattern;
}

// Utility function to get pattern URL for CSS
export function getPatternUrlV2(severity: SeverityLevel, highContrast = false): string {
  const pattern = getPatternV2(severity, highContrast);
  const id = highContrast ? `${pattern.id}-hc` : pattern.id;
  return `url(#${id})`;
}

// Utility function to get colors for a severity level
export function getPatternColorsV2(severity: SeverityLevel, highContrast = false) {
  const pattern = getPatternV2(severity, highContrast);
  return highContrast ? pattern.colorScheme.highContrast : pattern.colorScheme;
}