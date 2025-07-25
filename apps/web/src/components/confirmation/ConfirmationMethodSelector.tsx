'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type ConfirmationMethod = 'click' | 'hold' | 'type';

interface ConfirmationMethodOption {
  value: ConfirmationMethod;
  title: string;
  description: string;
  recommended?: boolean;
}

interface ConfirmationMethodSelectorProps {
  value: ConfirmationMethod;
  onChange: (method: ConfirmationMethod) => void;
  defaultMethod?: ConfirmationMethod;
  recommendedMethod?: ConfirmationMethod;
  className?: string;
  disabled?: boolean;
}

const defaultOptions: ConfirmationMethodOption[] = [
  {
    value: 'click',
    title: 'Standard Click',
    description: 'Quick confirmation for non-critical actions'
  },
  {
    value: 'hold',
    title: 'Hold to Confirm',
    description: 'Prevents accidental clicks'
  },
  {
    value: 'type',
    title: 'Type to Confirm',
    description: 'Maximum security for critical actions'
  }
];

export function ConfirmationMethodSelector({
  value,
  onChange,
  defaultMethod = 'hold',
  recommendedMethod,
  className,
  disabled = false
}: ConfirmationMethodSelectorProps) {
  const radioGroupRef = useRef<HTMLDivElement>(null);

  // Set default value on mount if none provided
  useEffect(() => {
    if (!value && defaultMethod) {
      onChange(defaultMethod);
    }
  }, [value, defaultMethod, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const currentIndex = defaultOptions.findIndex(opt => opt.value === value);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (currentIndex + 1) % defaultOptions.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex === 0 ? defaultOptions.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = defaultOptions.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      const newOption = defaultOptions[newIndex];
      if (newOption) {
        onChange(newOption.value);
        
        // Focus the new radio button
        const radios = radioGroupRef.current?.querySelectorAll('input[type="radio"]');
        if (radios && radios[newIndex]) {
          (radios[newIndex] as HTMLInputElement).focus();
        }
      }
    }
  };

  const options = defaultOptions.map(opt => ({
    ...opt,
    recommended: opt.value === recommendedMethod
  }));

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-base font-medium text-gray-900">
        Choose confirmation method:
      </h3>
      
      <div 
        ref={radioGroupRef}
        role="radiogroup"
        aria-labelledby="confirmation-method-label"
        className="space-y-3"
        onKeyDown={handleKeyDown}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              'relative flex items-start p-4 border-2 rounded-lg transition-all duration-200',
              'hover:border-blue-500 hover:bg-gray-50',
              {
                'border-blue-500 bg-blue-50': option.recommended,
                'border-gray-200': !option.recommended && value !== option.value,
                'border-blue-600 ring-2 ring-blue-500 ring-offset-2': value === option.value,
                'opacity-50 cursor-not-allowed': disabled
              }
            )}
          >
            <div className="flex items-center h-5">
              <input
                id={`method-${option.value}`}
                name="confirmation-method"
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value as ConfirmationMethod)}
                disabled={disabled}
                className={cn(
                  'h-4 w-4 text-blue-600 border-gray-300',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-describedby={`method-${option.value}-description`}
              />
            </div>
            
            <label
              htmlFor={`method-${option.value}`}
              className={cn(
                'ml-3 flex-1 cursor-pointer',
                disabled && 'cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-gray-900">
                  {option.title}
                </span>
                {option.recommended && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                    Recommended
                  </span>
                )}
              </div>
              <p
                id={`method-${option.value}-description`}
                className="mt-1 text-sm text-gray-600"
              >
                {option.description}
              </p>
            </label>
          </div>
        ))}
      </div>
      
      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        <span>
          {value && `Selected confirmation method: ${options.find(o => o.value === value)?.title}`}
        </span>
      </div>
    </div>
  );
}