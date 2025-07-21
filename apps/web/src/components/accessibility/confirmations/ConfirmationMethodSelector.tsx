'use client';

import React, { useEffect } from 'react';
import { useAccessibilityPreferences, useAnnouncement } from '@/contexts/accessibility';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MousePointer, Timer, Keyboard, Fingerprint, Mic, PenTool } from 'lucide-react';

export type ConfirmationMethod = 
  | 'standard_click'
  | 'hold_to_confirm'
  | 'type_to_confirm'
  | 'biometric'
  | 'voice'
  | 'pattern_draw';

export interface ConfirmationMethodOption {
  id: ConfirmationMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  requiresSetup?: boolean;
  experimental?: boolean;
}

const defaultMethods: ConfirmationMethodOption[] = [
  {
    id: 'standard_click',
    label: 'Standard Click',
    description: 'Click the confirm button to proceed',
    icon: <MousePointer className="h-5 w-5" />,
    available: true,
  },
  {
    id: 'hold_to_confirm',
    label: 'Hold to Confirm',
    description: 'Press and hold the button for 3 seconds',
    icon: <Timer className="h-5 w-5" />,
    available: true,
  },
  {
    id: 'type_to_confirm',
    label: 'Type to Confirm',
    description: 'Type a specific phrase to confirm',
    icon: <Keyboard className="h-5 w-5" />,
    available: true,
  },
  {
    id: 'biometric',
    label: 'Biometric',
    description: 'Use Face ID or Touch ID',
    icon: <Fingerprint className="h-5 w-5" />,
    available: false,
    requiresSetup: true,
    experimental: true,
  },
  {
    id: 'voice',
    label: 'Voice Confirmation',
    description: 'Say the confirmation phrase',
    icon: <Mic className="h-5 w-5" />,
    available: false,
    experimental: true,
  },
  {
    id: 'pattern_draw',
    label: 'Draw Pattern',
    description: 'Draw a specific pattern to confirm',
    icon: <PenTool className="h-5 w-5" />,
    available: false,
    experimental: true,
  },
];

export interface ConfirmationMethodSelectorProps {
  value?: ConfirmationMethod;
  onValueChange?: (value: ConfirmationMethod) => void;
  methods?: ConfirmationMethodOption[];
  className?: string;
  showUnavailable?: boolean;
  savePreference?: boolean;
}

export function ConfirmationMethodSelector({
  value,
  onValueChange,
  methods = defaultMethods,
  className,
  showUnavailable = true,
  savePreference = true,
}: ConfirmationMethodSelectorProps) {
  const { preferences, updatePreferences } = useAccessibilityPreferences();
  const { announce } = useAnnouncement();
  
  // Use preference if no value provided
  const selectedMethod = value || preferences?.preferredConfirmationMethod || 'standard_click';

  // Filter methods based on availability
  const displayMethods = showUnavailable
    ? methods
    : methods.filter(m => m.available);

  // Handle method change
  const handleMethodChange = (newMethod: string) => {
    const method = newMethod as ConfirmationMethod;
    const methodOption = methods.find(m => m.id === method);
    
    if (methodOption) {
      announce(`Confirmation method changed to ${methodOption.label}`, 'polite');
      
      // Call onChange callback
      onValueChange?.(method);
      
      // Save to preferences if enabled
      if (savePreference) {
        updatePreferences({ preferredConfirmationMethod: method });
      }
    }
  };

  // Announce current method on mount
  useEffect(() => {
    const currentMethod = methods.find(m => m.id === selectedMethod);
    if (currentMethod) {
      announce(
        `Current confirmation method: ${currentMethod.label}. ${currentMethod.description}`,
        'polite'
      );
    }
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-sm font-medium mb-1">Confirmation Method</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you'd like to confirm important actions
        </p>
      </div>

      <RadioGroup
        value={selectedMethod}
        onValueChange={handleMethodChange}
        className="space-y-3"
      >
        {displayMethods.map((method) => (
          <div
            key={method.id}
            className={cn(
              'relative flex items-start space-x-3 rounded-lg border p-4 transition-colors',
              method.available
                ? 'hover:bg-accent/50 cursor-pointer'
                : 'opacity-50 cursor-not-allowed bg-muted/20',
              selectedMethod === method.id && 'border-primary bg-accent/20'
            )}
          >
            <RadioGroupItem
              value={method.id}
              id={method.id}
              disabled={!method.available}
              className="mt-1"
              aria-describedby={`${method.id}-description`}
            />
            
            <div className="flex-1">
              <Label
                htmlFor={method.id}
                className={cn(
                  'flex items-center gap-2 font-medium cursor-pointer',
                  !method.available && 'cursor-not-allowed'
                )}
              >
                <span className="text-muted-foreground">{method.icon}</span>
                <span>{method.label}</span>
                {method.experimental && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                    Experimental
                  </span>
                )}
                {method.requiresSetup && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                    Setup Required
                  </span>
                )}
              </Label>
              
              <p
                id={`${method.id}-description`}
                className="text-sm text-muted-foreground mt-1"
              >
                {method.description}
                {!method.available && ' (Not available)'}
              </p>
            </div>
          </div>
        ))}
      </RadioGroup>

      {/* Additional information */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          Your selection will be saved and used for all future confirmations.
        </p>
        <p>
          You can change this anytime in your accessibility settings.
        </p>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {displayMethods.filter(m => !m.available).length > 0 && (
          <span>
            Some confirmation methods are not currently available.
            {' '}Available methods are:
            {' '}{displayMethods.filter(m => m.available).map(m => m.label).join(', ')}.
          </span>
        )}
      </div>
    </div>
  );
}

// Hook to get current confirmation method
export function useConfirmationMethod() {
  const { preferences } = useAccessibilityPreferences();
  const method = preferences?.preferredConfirmationMethod || 'standard_click';
  const methodOption = defaultMethods.find(m => m.id === method);
  
  return {
    method,
    methodOption,
    isAvailable: methodOption?.available || false,
  };
}