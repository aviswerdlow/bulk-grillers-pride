'use client';

import React, { useEffect, useRef } from 'react';
import { useAnnouncement } from '@/contexts/accessibility';
import { cn } from '@/lib/utils';

export interface StatusAnnouncerProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning' | string;
  message?: string;
  autoAnnounce?: boolean;
  announceDelay?: number;
  priority?: 'polite' | 'assertive';
  children?: React.ReactNode;
  className?: string;
  visuallyHidden?: boolean;
}

const defaultMessages: Record<string, string> = {
  idle: 'Ready',
  loading: 'Loading, please wait',
  success: 'Operation completed successfully',
  error: 'An error occurred',
  warning: 'Warning: Please review',
};

const statusPriorities: Record<string, 'polite' | 'assertive'> = {
  idle: 'polite',
  loading: 'polite',
  success: 'polite',
  error: 'assertive',
  warning: 'assertive',
};

export function StatusAnnouncer({
  status,
  message,
  autoAnnounce = true,
  announceDelay = 0,
  priority,
  children,
  className,
  visuallyHidden = false,
}: StatusAnnouncerProps) {
  const { announce } = useAnnouncement();
  const previousStatus = useRef(status);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const effectivePriority = priority || statusPriorities[status] || 'polite';
  const effectiveMessage = message || defaultMessages[status] || status;

  useEffect(() => {
    if (autoAnnounce && status !== previousStatus.current) {
      // Clear any pending announcement
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Announce with optional delay
      if (announceDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          announce(effectiveMessage, effectivePriority);
        }, announceDelay);
      } else {
        announce(effectiveMessage, effectivePriority);
      }

      previousStatus.current = status;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status, effectiveMessage, effectivePriority, autoAnnounce, announceDelay, announce]);

  const content = children || effectiveMessage;

  return (
    <div
      role="status"
      aria-live={effectivePriority}
      aria-atomic="true"
      className={cn(
        visuallyHidden && 'sr-only',
        className
      )}
    >
      {content}
    </div>
  );
}

// Loading state announcer
export function LoadingAnnouncer({
  loading,
  loadingMessage = 'Loading, please wait',
  completeMessage = 'Loading complete',
  errorMessage,
  children,
}: {
  loading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
  errorMessage?: string | null;
  children?: React.ReactNode;
}) {
  const status = errorMessage ? 'error' : loading ? 'loading' : 'success';
  const message = errorMessage || (loading ? loadingMessage : completeMessage);

  return (
    <StatusAnnouncer
      status={status}
      message={message}
      autoAnnounce={true}
      visuallyHidden={!children}
    >
      {children}
    </StatusAnnouncer>
  );
}

// Form submission announcer
export function FormStatusAnnouncer({
  submitting,
  success,
  error,
  successMessage = 'Form submitted successfully',
  submittingMessage = 'Submitting form, please wait',
  visuallyHidden = true,
}: {
  submitting: boolean;
  success: boolean;
  error?: string | null;
  successMessage?: string;
  submittingMessage?: string;
  visuallyHidden?: boolean;
}) {
  const status = error ? 'error' : submitting ? 'loading' : success ? 'success' : 'idle';
  const message = error || (submitting ? submittingMessage : success ? successMessage : '');

  if (status === 'idle') return null;

  return (
    <StatusAnnouncer
      status={status}
      message={message}
      autoAnnounce={true}
      visuallyHidden={visuallyHidden}
    />
  );
}

// Operation result announcer
export function OperationResultAnnouncer({
  operation,
  result,
  itemCount,
  itemName = 'item',
}: {
  operation: 'create' | 'update' | 'delete' | 'save' | string;
  result: 'success' | 'error' | 'partial';
  itemCount?: number;
  itemName?: string;
}) {
  const { announce } = useAnnouncement();

  useEffect(() => {
    let message = '';
    const items = itemCount ? `${itemCount} ${itemName}${itemCount > 1 ? 's' : ''}` : itemName;

    switch (result) {
      case 'success':
        message = `Successfully ${operation}d ${items}`;
        break;
      case 'error':
        message = `Failed to ${operation} ${items}`;
        break;
      case 'partial':
        message = `Partially ${operation}d ${items}. Some items may have failed.`;
        break;
    }

    if (message) {
      announce(message, result === 'error' ? 'assertive' : 'polite');
    }
  }, [operation, result, itemCount, itemName, announce]);

  return null;
}

// Countdown announcer for timed actions
export function CountdownAnnouncer({
  seconds,
  message = 'seconds remaining',
  announceInterval = 10,
  announceLastSeconds = 5,
}: {
  seconds: number;
  message?: string;
  announceInterval?: number;
  announceLastSeconds?: number;
}) {
  const { announce } = useAnnouncement();
  const lastAnnounced = useRef(seconds);

  useEffect(() => {
    const shouldAnnounce = 
      seconds <= announceLastSeconds ||
      (seconds % announceInterval === 0 && seconds !== lastAnnounced.current);

    if (shouldAnnounce && seconds > 0) {
      announce(`${seconds} ${message}`, seconds <= announceLastSeconds ? 'assertive' : 'polite');
      lastAnnounced.current = seconds;
    } else if (seconds === 0 && lastAnnounced.current !== 0) {
      announce('Time expired', 'assertive');
      lastAnnounced.current = 0;
    }
  }, [seconds, message, announceInterval, announceLastSeconds, announce]);

  return (
    <div role="timer" aria-live="polite" className="sr-only">
      {seconds} {message}
    </div>
  );
}