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
    highContrast: {
      primary: string;
      secondary: string;
    };
  };
  textureDescription: string;
}

// Pattern definitions as React components
const patterns: Record<SeverityLevel, PatternDefinition> = {
  info: {
    id: 'pattern-info',
    name: 'Information',
    severity: 'info',
    svgPattern: (
      <pattern id="pattern-info" patternUnits="userSpaceOnUse" width="10" height="10">
        <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.3" />
        <circle cx="7" cy="7" r="1" fill="currentColor" opacity="0.3" />
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-info-hc" patternUnits="userSpaceOnUse" width="10" height="10">
        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      </pattern>
    ),
    colorScheme: {
      primary: '#3b82f6', // blue-500
      secondary: '#dbeafe', // blue-100
      highContrast: {
        primary: '#1e40af', // blue-800
        secondary: '#ffffff',
      },
    },
    textureDescription: 'Sparse dot pattern indicating low severity information',
  },
  warning: {
    id: 'pattern-warning',
    name: 'Warning',
    severity: 'warning',
    svgPattern: (
      <pattern id="pattern-warning" patternUnits="userSpaceOnUse" width="10" height="10">
        <path
          d="M0,10 L10,0"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
          fill="none"
        />
        <path
          d="M-5,5 L5,-5"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
          fill="none"
        />
        <path
          d="M5,15 L15,5"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
          fill="none"
        />
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-warning-hc" patternUnits="userSpaceOnUse" width="10" height="10">
        <path
          d="M0,10 L10,0"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M-5,5 L5,-5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M5,15 L15,5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </pattern>
    ),
    colorScheme: {
      primary: '#f59e0b', // amber-500
      secondary: '#fef3c7', // amber-100
      highContrast: {
        primary: '#92400e', // amber-800
        secondary: '#ffffff',
      },
    },
    textureDescription: 'Diagonal stripe pattern indicating medium severity warning',
  },
  danger: {
    id: 'pattern-danger',
    name: 'Danger',
    severity: 'danger',
    svgPattern: (
      <pattern id="pattern-danger" patternUnits="userSpaceOnUse" width="10" height="10">
        <path
          d="M0,0 L10,10 M0,10 L10,0"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
          fill="none"
        />
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-danger-hc" patternUnits="userSpaceOnUse" width="10" height="10">
        <path
          d="M0,0 L10,10 M0,10 L10,0"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </pattern>
    ),
    colorScheme: {
      primary: '#ef4444', // red-500
      secondary: '#fee2e2', // red-100
      highContrast: {
        primary: '#991b1b', // red-800
        secondary: '#ffffff',
      },
    },
    textureDescription: 'Cross-hatch pattern indicating high severity danger',
  },
  critical: {
    id: 'pattern-critical',
    name: 'Critical',
    severity: 'critical',
    svgPattern: (
      <pattern id="pattern-critical" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect x="0" y="0" width="2" height="2" fill="currentColor" opacity="0.6" />
        <rect x="2" y="2" width="2" height="2" fill="currentColor" opacity="0.6" />
      </pattern>
    ),
    highContrastVariant: (
      <pattern id="pattern-critical-hc" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect x="0" y="0" width="2" height="2" fill="currentColor" />
        <rect x="2" y="2" width="2" height="2" fill="currentColor" />
      </pattern>
    ),
    colorScheme: {
      primary: '#7c3aed', // violet-600
      secondary: '#ede9fe', // violet-100
      highContrast: {
        primary: '#4c1d95', // violet-900
        secondary: '#ffffff',
      },
    },
    textureDescription: 'Dense checkerboard pattern indicating critical severity',
  },
};

// SVG Pattern Provider Component
export function PatternDefs({ highContrast = false }: { highContrast?: boolean }) {
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
export function getPattern(severity: SeverityLevel, highContrast = false): PatternDefinition {
  const pattern = patterns[severity];
  if (!pattern) {
    console.warn(`Unknown severity level: ${severity}`);
    return patterns.info; // Default fallback
  }
  return pattern;
}

// Utility function to get pattern URL for CSS
export function getPatternUrl(severity: SeverityLevel, highContrast = false): string {
  const pattern = getPattern(severity, highContrast);
  const id = highContrast ? `${pattern.id}-hc` : pattern.id;
  return `url(#${id})`;
}

// Utility function to get colors for a severity level
export function getPatternColors(severity: SeverityLevel, highContrast = false) {
  const pattern = getPattern(severity, highContrast);
  return highContrast ? pattern.colorScheme.highContrast : pattern.colorScheme;
}