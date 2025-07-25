'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { usePattern } from './usePattern';
import { PatternDefs } from './SeverityPatterns';
import type { SeverityLevel } from './SeverityPatterns';

export interface SeverityIndicatorProps {
  severity: SeverityLevel;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'text';
  showPattern?: boolean;
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function SeverityIndicator({
  severity,
  children,
  className,
  size = 'md',
  variant = 'filled',
  showPattern = true,
  ariaLabel,
}: SeverityIndicatorProps) {
  const { patternUrl, colors, textureDescription, highContrast } = usePattern(severity);

  const baseClasses = cn(
    'inline-flex items-center font-medium rounded-md transition-all',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizeClasses[size]
  );

  const variantClasses = {
    filled: cn(
      'border-2',
      showPattern && 'relative overflow-hidden'
    ),
    outlined: 'border-2 bg-transparent',
    text: 'bg-transparent border-0',
  };

  // Dynamic styles based on pattern config
  const dynamicStyles: React.CSSProperties = {
    borderColor: colors.primary,
    color: variant === 'filled' ? (highContrast ? '#000000' : colors.primary) : colors.primary,
    backgroundColor: variant === 'filled' ? colors.secondary : 'transparent',
  };

  // Pattern overlay styles
  const patternStyles: React.CSSProperties = showPattern && variant === 'filled' ? {
    position: 'absolute',
    inset: 0,
    backgroundImage: patternUrl,
    backgroundRepeat: 'repeat',
    pointerEvents: 'none',
    opacity: highContrast ? 1 : 0.8,
    color: colors.primary,
  } : {};

  const computedAriaLabel = ariaLabel || `${severity} severity: ${textureDescription}`;

  return (
    <>
      <PatternDefs highContrast={highContrast} />
      <span
        className={cn(baseClasses, variantClasses[variant], className)}
        style={dynamicStyles}
        role="status"
        aria-label={computedAriaLabel}
      >
        {showPattern && variant === 'filled' && (
          <span
            className="severity-pattern"
            style={patternStyles}
            aria-hidden="true"
          />
        )}
        <span className="relative z-10">
          {children || severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
      </span>
    </>
  );
}

// Compound component for icon + text
export function SeverityIndicatorWithIcon({
  severity,
  icon,
  label,
  ...props
}: SeverityIndicatorProps & {
  icon?: React.ReactNode;
  label?: string;
}) {
  return (
    <SeverityIndicator severity={severity} {...props}>
      <span className="flex items-center gap-1.5">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{label || severity}</span>
      </span>
    </SeverityIndicator>
  );
}

// Batch component for rendering multiple indicators
export function SeverityIndicatorGroup({
  items,
  className,
  size = 'sm',
  variant = 'filled',
}: {
  items: Array<{ severity: SeverityLevel; label?: string; count?: number }>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'text';
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item, index) => (
        <SeverityIndicator
          key={`${item.severity}-${index}`}
          severity={item.severity}
          size={size}
          variant={variant}
        >
          {item.label || item.severity}
          {item.count !== undefined && (
            <span className="ml-1 opacity-75">({item.count})</span>
          )}
        </SeverityIndicator>
      ))}
    </div>
  );
}