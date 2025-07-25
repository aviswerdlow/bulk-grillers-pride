'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { useFocusManagement, useAnnouncement } from '@/contexts/accessibility';
import { cn } from '@/lib/utils';

export interface FocusTrapManagerProps {
  active: boolean;
  children: React.ReactNode;
  onEscapeKey?: () => void;
  onClickOutside?: () => void;
  className?: string;
  focusTrapOptions?: {
    initialFocus?: string | HTMLElement | (() => HTMLElement);
    fallbackFocus?: string | HTMLElement;
    escapeDeactivates?: boolean;
    clickOutsideDeactivates?: boolean;
    allowOutsideClick?: boolean | ((e: MouseEvent | TouchEvent) => boolean);
    preventScroll?: boolean;
  };
  restoreFocus?: boolean;
  announceOnActivate?: string;
  announceOnDeactivate?: string;
}

export function FocusTrapManager({
  active,
  children,
  onEscapeKey,
  onClickOutside,
  className,
  focusTrapOptions = {},
  restoreFocus = true,
  announceOnActivate,
  announceOnDeactivate,
}: FocusTrapManagerProps) {
  const { pushFocus, popFocus } = useFocusManagement();
  const { announce } = useAnnouncement();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save current focus when trap activates
  useEffect(() => {
    if (active && restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      pushFocus({
        elementId: previousFocusRef.current?.id || 'unknown',
        context: 'modal',
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY,
        },
      });

      if (announceOnActivate) {
        announce(announceOnActivate, 'assertive');
      }
    }

    return () => {
      if (!active && restoreFocus && previousFocusRef.current) {
        const focusState = popFocus();
        
        // Restore focus
        setTimeout(() => {
          if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
            previousFocusRef.current.focus();
          }
          
          // Restore scroll position if available
          if (focusState?.scrollPosition) {
            window.scrollTo(focusState.scrollPosition.x, focusState.scrollPosition.y);
          }
        }, 0);

        if (announceOnDeactivate) {
          announce(announceOnDeactivate, 'polite');
        }
      }
    };
  }, [active, restoreFocus, pushFocus, popFocus, announce, announceOnActivate, announceOnDeactivate]);

  // Handle escape key
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onEscapeKey) {
      e.preventDefault();
      onEscapeKey();
    }
  }, [onEscapeKey]);

  useEffect(() => {
    if (active && onEscapeKey) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
    return undefined;
  }, [active, handleEscapeKey, onEscapeKey]);

  // Default focus trap options
  const defaultOptions = {
    escapeDeactivates: false, // We handle escape manually
    clickOutsideDeactivates: !!onClickOutside,
    onDeactivate: () => {
      if (onClickOutside) {
        onClickOutside();
      }
    },
    preventScroll: true,
    ...focusTrapOptions,
  };

  if (!active) {
    return <>{children}</>;
  }

  return (
    <FocusTrap focusTrapOptions={defaultOptions}>
      <div
        ref={containerRef}
        className={cn('focus-trap-container', className)}
        data-focus-trap-active="true"
      >
        {children}
      </div>
    </FocusTrap>
  );
}

// Dialog-specific focus trap
export function DialogFocusTrap({
  open,
  children,
  onClose,
  dialogTitle,
  ...props
}: {
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
  dialogTitle?: string;
} & Omit<FocusTrapManagerProps, 'active' | 'onEscapeKey' | 'onClickOutside'>) {
  return (
    <FocusTrapManager
      active={open}
      onEscapeKey={onClose}
      onClickOutside={onClose}
      announceOnActivate={dialogTitle ? `${dialogTitle} dialog opened` : 'Dialog opened'}
      announceOnDeactivate="Dialog closed"
      {...props}
    >
      {children}
    </FocusTrapManager>
  );
}

// Wizard-specific focus trap with step management
export function WizardFocusTrap({
  active,
  currentStep,
  totalSteps,
  children,
  onClose,
  wizardTitle,
  ...props
}: {
  active: boolean;
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  onClose: () => void;
  wizardTitle?: string;
} & Omit<FocusTrapManagerProps, 'active' | 'onEscapeKey'>) {
  const { announce } = useAnnouncement();

  useEffect(() => {
    if (active) {
      announce(
        `${wizardTitle || 'Wizard'} step ${currentStep} of ${totalSteps}`,
        'polite'
      );
    }
  }, [active, currentStep, totalSteps, wizardTitle, announce]);

  return (
    <FocusTrapManager
      active={active}
      onEscapeKey={onClose}
      announceOnActivate={wizardTitle ? `${wizardTitle} wizard opened` : undefined}
      {...props}
    >
      {children}
    </FocusTrapManager>
  );
}