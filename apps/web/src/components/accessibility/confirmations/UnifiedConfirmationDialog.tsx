'use client';

import React, { useState, useCallback } from 'react';
import { useConfirmationMethod } from './ConfirmationMethodSelector';
import { HoldToConfirmButton } from './HoldToConfirmButton';
import { TypeToConfirmInput } from './TypeToConfirmInput';
import { useAnnouncement } from '@/contexts/accessibility';
import { DialogFocusTrap } from '@/components/accessibility/focus';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConfirmationMethod } from './ConfirmationMethodSelector';

export interface UnifiedConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmationPhrase?: string;
  severity?: 'info' | 'warning' | 'danger' | 'critical';
  loading?: boolean;
  error?: string | null;
  className?: string;
  children?: React.ReactNode;
  overrideMethod?: ConfirmationMethod;
  showMethodSelector?: boolean;
}

const severityColors = {
  info: 'border-blue-500 bg-blue-50',
  warning: 'border-yellow-500 bg-yellow-50',
  danger: 'border-red-500 bg-red-50',
  critical: 'border-purple-500 bg-purple-50',
};

const severityIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  danger: '⛔',
  critical: '🚨',
};

export function UnifiedConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmationPhrase,
  severity = 'danger',
  loading = false,
  error,
  className,
  children,
  overrideMethod,
  showMethodSelector = false,
}: UnifiedConfirmationDialogProps) {
  const { method: defaultMethod } = useConfirmationMethod();
  const { announce } = useAnnouncement();
  const [isConfirming, setIsConfirming] = useState(false);
  
  const method = overrideMethod || defaultMethod;
  
  // Generate default confirmation phrase if not provided
  const getDefaultPhrase = () => {
    if (confirmationPhrase) return confirmationPhrase;
    
    // Extract number from title if possible
    const numberMatch = title.match(/\d+/);
    const itemCount = numberMatch ? numberMatch[0] : '';
    
    if (title.toLowerCase().includes('delete')) {
      return itemCount ? `delete ${itemCount} items` : 'delete items';
    }
    
    return 'confirm action';
  };

  const phrase = getDefaultPhrase();

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (loading || isConfirming) return;

    setIsConfirming(true);
    announce('Processing your request', 'polite');

    try {
      await onConfirm();
      announce('Action completed successfully', 'assertive');
    } catch (err) {
      announce('Action failed. Please try again.', 'assertive');
      console.error('Confirmation error:', err);
    } finally {
      setIsConfirming(false);
    }
  }, [loading, isConfirming, onConfirm, announce]);

  // Render confirmation method
  const renderConfirmationMethod = () => {
    switch (method) {
      case 'hold_to_confirm':
        return (
          <HoldToConfirmButton
            onConfirm={handleConfirm}
            onCancel={onCancel}
            disabled={loading || isConfirming}
            className="w-full"
            variant={severity === 'critical' ? 'destructive' : 'default'}
          >
            Hold to Confirm
          </HoldToConfirmButton>
        );

      case 'type_to_confirm':
        return (
          <TypeToConfirmInput
            confirmationPhrase={phrase}
            onConfirm={handleConfirm}
            onCancel={onCancel}
            disabled={loading || isConfirming}
            caseSensitive={false}
            allowPaste={false}
            showHint={true}
            hintObfuscation="partial"
          />
        );

      case 'standard_click':
      default:
        return (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading || isConfirming}
            >
              Cancel
            </Button>
            <Button
              variant={severity === 'critical' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading || isConfirming}
            >
              {loading || isConfirming ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        );
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <DialogFocusTrap
        open={open}
        onClose={onCancel}
        dialogTitle={title}
        className={cn(
          'bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto',
          className
        )}
      >
        <div className="p-6 space-y-4">
          {/* Header with severity indicator */}
          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2',
              severityColors[severity]
            )}
          >
            <span className="text-2xl flex-shrink-0" aria-hidden="true">
              {severityIcons[severity]}
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Additional content */}
          {children && (
            <div className="space-y-4">
              {children}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Method selector (if enabled) */}
          {showMethodSelector && (
            <details className="border rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-sm">
                Change confirmation method
              </summary>
              <div className="mt-4">
                {/* Would include ConfirmationMethodSelector here */}
                <p className="text-sm text-muted-foreground">
                  Method selector would appear here
                </p>
              </div>
            </details>
          )}

          {/* Confirmation method */}
          <div className="pt-4 border-t">
            {renderConfirmationMethod()}
          </div>

          {/* Loading state overlay */}
          {(loading || isConfirming) && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Processing...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogFocusTrap>
    </div>
  );
}

// Simplified confirmation hook
export function useConfirmation() {
  const [confirmationState, setConfirmationState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    severity?: 'info' | 'warning' | 'danger' | 'critical';
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    open: false,
    title: '',
  });

  const confirm = useCallback((options: {
    title: string;
    description?: string;
    severity?: 'info' | 'warning' | 'danger' | 'critical';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({
        open: true,
        ...options,
        onConfirm: () => {
          setConfirmationState(prev => ({ ...prev, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmationState(prev => ({ ...prev, open: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const dialog = (
    <UnifiedConfirmationDialog
      open={confirmationState.open}
      title={confirmationState.title}
      description={confirmationState.description}
      severity={confirmationState.severity}
      onConfirm={confirmationState.onConfirm || (() => {})}
      onCancel={confirmationState.onCancel || (() => {})}
    />
  );

  return { confirm, dialog };
}