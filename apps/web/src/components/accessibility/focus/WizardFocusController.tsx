'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useFocusManagement, useAnnouncement, useAccessibility } from '@/contexts/accessibility';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  focusTarget?: string; // CSS selector for initial focus element
  ariaLabel?: string;
}

export interface WizardFocusControllerProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  className?: string;
  announceStepChanges?: boolean;
  enableKeyboardNavigation?: boolean;
}

export function WizardFocusController({
  steps,
  currentStep,
  onStepChange,
  children,
  className,
  announceStepChanges = true,
  enableKeyboardNavigation = true,
}: WizardFocusControllerProps) {
  const { pushFocus } = useFocusManagement();
  const { announce } = useAnnouncement();
  const { registerShortcut, unregisterShortcut } = useAccessibility();
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusZones, setFocusZones] = useState<Map<string, HTMLElement[]>>(new Map());

  // Get current step info
  const currentStepInfo = steps[currentStep] || steps[0] || null;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Focus first element in current step
  const focusFirstElement = useCallback(() => {
    if (!containerRef.current) return;

    setTimeout(() => {
      if (!currentStepInfo) return;
      const focusTarget = currentStepInfo.focusTarget;
      
      if (focusTarget) {
        const element = containerRef.current?.querySelector(focusTarget) as HTMLElement;
        if (element) {
          element.focus();
          return;
        }
      }

      // Fallback: focus first focusable element
      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }, 100); // Small delay to ensure DOM is ready
  }, [currentStepInfo]);

  // Handle step changes
  useEffect(() => {
    if (announceStepChanges) {
      const stepAnnouncement = `Step ${currentStep + 1} of ${steps.length}: ${currentStepInfo?.title || 'Unknown step'}`;
      announce(stepAnnouncement, 'polite');
    }

    // Save focus state for current step
    pushFocus({
      elementId: `wizard-step-${currentStep}`,
      context: 'wizard',
    });

    // Focus first element in new step
    focusFirstElement();
  }, [currentStep, steps.length, currentStepInfo?.title, announceStepChanges, announce, pushFocus, focusFirstElement]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, isFirstStep, onStepChange]);

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    if (!isLastStep) {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, isLastStep, onStepChange]);

  // Setup keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation) return;

    // Register shortcuts
    registerShortcut('alt+left', goToPreviousStep);
    registerShortcut('alt+right', goToNextStep);
    
    // Page Up/Down for step navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PageUp' && !isFirstStep) {
        e.preventDefault();
        goToPreviousStep();
      } else if (e.key === 'PageDown' && !isLastStep) {
        e.preventDefault();
        goToNextStep();
      }
    };

    const container = containerRef.current;
    container?.addEventListener('keydown', handleKeyDown);
    
    return () => {
      unregisterShortcut('alt+left');
      unregisterShortcut('alt+right');
      container?.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardNavigation, registerShortcut, unregisterShortcut, goToPreviousStep, goToNextStep, isFirstStep, isLastStep]);

  // Setup focus zones for current step
  useEffect(() => {
    if (!containerRef.current) return;

    const updateFocusZones = () => {
      const zones = new Map<string, HTMLElement[]>();
      
      // Find all focus zones in current step
      const zoneElements = containerRef.current?.querySelectorAll('[data-focus-zone]');
      
      zoneElements?.forEach((zone) => {
        const zoneName = zone.getAttribute('data-focus-zone') || 'default';
        const focusableElements = zone.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        zones.set(zoneName, Array.from(focusableElements) as HTMLElement[]);
      });

      setFocusZones(zones);
    };

    updateFocusZones();

    // Watch for DOM changes
    const observer = new MutationObserver(updateFocusZones);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [currentStep]);

  // Arrow key navigation within focus zones
  useEffect(() => {
    const handleArrowNavigation = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement || !containerRef.current?.contains(activeElement)) return;

      // Find which zone the active element belongs to
      let currentZone: string | null = null;
      let currentElements: HTMLElement[] = [];
      let currentIndex = -1;

      focusZones.forEach((elements, zoneName) => {
        const index = elements.indexOf(activeElement);
        if (index !== -1) {
          currentZone = zoneName;
          currentElements = elements;
          currentIndex = index;
        }
      });

      if (currentZone && currentIndex !== -1) {
        e.preventDefault();
        
        let nextIndex = currentIndex;
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % currentElements.length;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          nextIndex = currentIndex === 0 ? currentElements.length - 1 : currentIndex - 1;
        }

        currentElements[nextIndex]?.focus();
      }
    };

    const container = containerRef.current;
    container?.addEventListener('keydown', handleArrowNavigation);
    return () => container?.removeEventListener('keydown', handleArrowNavigation);
  }, [focusZones]);

  return (
    <div
      ref={containerRef}
      className={cn('wizard-focus-controller', className)}
      role="region"
      aria-label={currentStepInfo?.ariaLabel || (currentStepInfo ? `${currentStepInfo.title} wizard step` : 'Wizard step')}
      data-wizard-step={currentStep}
    >
      {/* Progress indicator for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Step {currentStep + 1} of {steps.length}
      </div>

      {/* Step content */}
      {children}

      {/* Hidden navigation instructions for screen readers */}
      <div className="sr-only">
        {!isFirstStep && 'Press Alt+Left Arrow to go to previous step.'}
        {!isLastStep && 'Press Alt+Right Arrow to go to next step.'}
        Press Tab to navigate through form fields.
        Use arrow keys to navigate within groups.
      </div>
    </div>
  );
}

// Hook for using wizard focus in components
export function useWizardFocus(steps: WizardStep[], currentStep: number) {
  const { announce } = useAnnouncement();
  const [focusHistory, setFocusHistory] = useState<string[]>([]);

  const announceStep = useCallback((step: number) => {
    const stepInfo = steps[step];
    if (stepInfo) {
      announce(`Step ${step + 1} of ${steps.length}: ${stepInfo.title}`, 'polite');
    }
  }, [steps, announce]);

  const recordFocus = useCallback((elementId: string) => {
    setFocusHistory(prev => [...prev, elementId]);
  }, []);

  const getStepProgress = () => ({
    current: currentStep + 1,
    total: steps.length,
    percentage: Math.round(((currentStep + 1) / steps.length) * 100),
    isFirst: currentStep === 0,
    isLast: currentStep === steps.length - 1,
  });

  return {
    announceStep,
    recordFocus,
    focusHistory,
    stepProgress: getStepProgress(),
  };
}