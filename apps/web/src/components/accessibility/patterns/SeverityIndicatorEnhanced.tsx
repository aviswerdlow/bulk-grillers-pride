'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { usePatternV2 } from './usePatternV2';
import { PatternDefsV2 } from './SeverityPatternsV2';
import type { SeverityLevel } from './SeverityPatternsV2';
import { 
  InfoIcon, 
  AlertTriangleIcon, 
  XCircleIcon, 
  AlertOctagonIcon 
} from 'lucide-react';

export interface SeverityIndicatorEnhancedProps {
  severity: SeverityLevel;
  label?: string;
  message?: string;
  pattern?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'text';
  showIcon?: boolean;
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm gap-2',
  md: 'px-4 py-3 text-base gap-3',
  lg: 'px-5 py-4 text-lg gap-3',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const severityIcons: Record<SeverityLevel, React.ElementType> = {
  info: InfoIcon,
  warning: AlertTriangleIcon,
  danger: XCircleIcon,
  critical: AlertOctagonIcon,
};

export function SeverityIndicatorEnhanced({
  severity,
  label,
  message,
  pattern = true,
  className,
  size = 'md',
  variant = 'filled',
  showIcon = true,
  ariaLabel,
}: SeverityIndicatorEnhancedProps) {
  const { patternUrl, colors, textureDescription, highContrast } = usePatternV2(severity);
  const Icon = severityIcons[severity];

  const baseClasses = cn(
    'flex items-start rounded-md transition-all',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2',
    sizeClasses[size]
  );

  const variantClasses = {
    filled: cn(
      'border-2',
      pattern && 'relative overflow-hidden'
    ),
    outlined: 'border-2 bg-transparent',
    text: 'bg-transparent border-0',
  };

  // Dynamic styles based on pattern config
  const dynamicStyles: React.CSSProperties = {
    borderColor: colors.primary,
    color: variant === 'filled' ? colors.text : colors.primary,
    backgroundColor: variant === 'filled' ? colors.secondary : 'transparent',
  };

  // Focus ring color
  const focusRingColor = highContrast ? 'focus-within:ring-black' : `focus-within:ring-${severity}`;

  // Pattern overlay styles
  const patternStyles: React.CSSProperties = pattern && variant === 'filled' ? {
    position: 'absolute',
    inset: 0,
    backgroundImage: patternUrl,
    backgroundRepeat: 'repeat',
    pointerEvents: 'none',
    opacity: highContrast ? 1 : undefined,
    color: colors.primary,
  } : {};

  const computedAriaLabel = ariaLabel || 
    `${severity} severity: ${label || severity}. ${message || ''}. ${textureDescription}`;

  const severityLabel = label || severity.charAt(0).toUpperCase() + severity.slice(1);

  return (
    <>
      <PatternDefsV2 highContrast={highContrast} />
      <div
        className={cn(baseClasses, variantClasses[variant], focusRingColor, className)}
        style={dynamicStyles}
        role="status"
        aria-label={computedAriaLabel}
      >
        {pattern && variant === 'filled' && (
          <span
            className="severity-pattern"
            style={patternStyles}
            aria-hidden="true"
          />
        )}
        {showIcon && Icon && (
          <Icon 
            className={cn(iconSizes[size], 'flex-shrink-0 relative z-10')} 
            aria-hidden="true" 
          />
        )}
        <div className="relative z-10 flex-1">
          <span className="font-semibold block">
            {severityLabel}
          </span>
          {message && (
            <span className="block mt-0.5 opacity-90">
              {message}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// Convenience components for specific severity levels
export function InfoIndicator(props: Omit<SeverityIndicatorEnhancedProps, 'severity'>) {
  return <SeverityIndicatorEnhanced {...props} severity="info" />;
}

export function WarningIndicator(props: Omit<SeverityIndicatorEnhancedProps, 'severity'>) {
  return <SeverityIndicatorEnhanced {...props} severity="warning" />;
}

export function DangerIndicator(props: Omit<SeverityIndicatorEnhancedProps, 'severity'>) {
  return <SeverityIndicatorEnhanced {...props} severity="danger" />;
}

export function CriticalIndicator(props: Omit<SeverityIndicatorEnhancedProps, 'severity'>) {
  return <SeverityIndicatorEnhanced {...props} severity="critical" />;
}