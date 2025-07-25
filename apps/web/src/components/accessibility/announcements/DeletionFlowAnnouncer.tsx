'use client';

import React, { useEffect, useRef } from 'react';
import { useAnnouncement, useAccessibilityPreferences } from '@/contexts/accessibility';
import { StatusLiveRegion, ProgressAnnouncer, ScreenReaderOnly } from './LiveRegionManager';
import type { SeverityLevel } from '@/components/accessibility/patterns';

export interface DeletionFlowAnnouncerProps {
  step: 'select' | 'review' | 'confirm' | 'processing' | 'complete';
  totalSteps: number;
  currentStepNumber: number;
  selectedCount: number;
  totalCount: number;
  deletedCount?: number;
  severity?: SeverityLevel;
  error?: string | null;
}

const stepTitles = {
  select: 'Select products for deletion',
  review: 'Review deletion consequences',
  confirm: 'Confirm deletion',
  processing: 'Processing deletion',
  complete: 'Deletion complete',
};

const severityDescriptions = {
  info: 'This is a low-impact action',
  warning: 'This action may have side effects',
  danger: 'This is a permanent action that cannot be undone',
  critical: 'This is a critical action with severe consequences',
};

export function DeletionFlowAnnouncer({
  step,
  totalSteps,
  currentStepNumber,
  selectedCount,
  totalCount,
  deletedCount = 0,
  severity = 'danger',
  error,
}: DeletionFlowAnnouncerProps) {
  const { announce } = useAnnouncement();
  const { preferences } = useAccessibilityPreferences();
  const previousStep = useRef(step);
  const previousSelectedCount = useRef(selectedCount);
  const previousError = useRef(error);
  
  const verbosity = preferences?.announcementVerbosity || 'standard';

  // Announce step changes
  useEffect(() => {
    if (step !== previousStep.current) {
      const stepTitle = stepTitles[step];
      let announcement = `Step ${currentStepNumber} of ${totalSteps}: ${stepTitle}`;
      
      // Add context based on verbosity
      if (verbosity === 'verbose') {
        if (step === 'review' && severity) {
          announcement += `. ${severityDescriptions[severity]}`;
        } else if (step === 'processing') {
          announcement += '. Please wait while we process your request';
        } else if (step === 'complete') {
          announcement += `. ${deletedCount} products successfully deleted`;
        }
      }
      
      announce(announcement, step === 'processing' ? 'assertive' : 'polite');
      previousStep.current = step;
    }
  }, [step, currentStepNumber, totalSteps, severity, deletedCount, verbosity, announce]);

  // Announce selection changes
  useEffect(() => {
    if (
      step === 'select' &&
      selectedCount !== previousSelectedCount.current &&
      previousSelectedCount.current !== -1 // Skip initial render
    ) {
      const announcement = selectedCount === 0
        ? 'No products selected'
        : `${selectedCount} of ${totalCount} products selected for deletion`;
      
      announce(announcement, 'polite');
      previousSelectedCount.current = selectedCount;
    }
  }, [selectedCount, totalCount, step, announce]);

  // Announce errors
  useEffect(() => {
    if (error && error !== previousError.current) {
      announce(`Error: ${error}`, 'assertive');
      previousError.current = error;
    }
  }, [error, announce]);

  // Announce severity warnings
  useEffect(() => {
    if (step === 'review' && severity && verbosity !== 'minimal') {
      const severityAnnouncement = `Warning: ${severityDescriptions[severity]}`;
      announce(severityAnnouncement, 'assertive');
    }
  }, [step, severity, verbosity, announce]);

  return (
    <>
      {/* Hidden semantic structure for screen readers */}
      <ScreenReaderOnly as="div">
        <h2>Delete Products Wizard</h2>
        <p>
          Step {currentStepNumber} of {totalSteps}: {stepTitles[step]}
        </p>
      </ScreenReaderOnly>

      {/* Status announcements */}
      {step === 'select' && (
        <StatusLiveRegion
          status={`${selectedCount} of ${totalCount} products selected`}
          prefix="Selection:"
          priority="polite"
        />
      )}

      {/* Progress during deletion */}
      {step === 'processing' && deletedCount !== undefined && (
        <ProgressAnnouncer
          current={deletedCount}
          total={selectedCount}
          itemName="product"
          autoAnnounce={true}
        />
      )}

      {/* Completion announcement */}
      {step === 'complete' && (
        <StatusLiveRegion
          status={`Deletion complete. ${deletedCount} products moved to trash.`}
          priority="assertive"
          autoAnnounce={true}
        />
      )}

      {/* Error announcements */}
      {error && (
        <StatusLiveRegion
          status={error}
          prefix="Error:"
          priority="assertive"
          autoAnnounce={true}
        />
      )}
    </>
  );
}

// Hook for deletion flow announcements
export function useDeletionAnnouncements() {
  const { announce } = useAnnouncement();
  const { preferences } = useAccessibilityPreferences();
  
  const verbosity = preferences?.announcementVerbosity || 'standard';

  const announceAction = (action: string, details?: string) => {
    let message = action;
    if (details && verbosity !== 'minimal') {
      message += `. ${details}`;
    }
    announce(message, 'polite');
  };

  const announceWarning = (warning: string) => {
    announce(`Warning: ${warning}`, 'assertive');
  };

  const announceError = (error: string) => {
    announce(`Error: ${error}`, 'assertive');
  };

  const announceProgress = (current: number, total: number, action = 'Processing') => {
    const percentage = Math.round((current / total) * 100);
    announce(`${action}: ${current} of ${total} (${percentage}%)`, 'polite');
  };

  const announceCompletion = (message: string) => {
    announce(message, 'assertive');
  };

  return {
    announceAction,
    announceWarning,
    announceError,
    announceProgress,
    announceCompletion,
  };
}

// Component for announcing form field errors
export function FormFieldAnnouncer({
  fieldName,
  error,
  required = false,
  description,
}: {
  fieldName: string;
  error?: string;
  required?: boolean;
  description?: string;
}) {
  const { announce } = useAnnouncement();
  const { preferences } = useAccessibilityPreferences();
  const previousError = useRef(error);
  
  const verbosity = preferences?.announcementVerbosity || 'standard';

  useEffect(() => {
    if (error && error !== previousError.current) {
      const errorMessage = `${fieldName} field error: ${error}`;
      announce(errorMessage, 'assertive');
      previousError.current = error;
    } else if (!error && previousError.current) {
      if (verbosity !== 'minimal') {
        announce(`${fieldName} field error cleared`, 'polite');
      }
      previousError.current = error;
    }
  }, [error, fieldName, verbosity, announce]);

  return (
    <ScreenReaderOnly>
      {required && <span>{fieldName} (required)</span>}
      {description && <span>{description}</span>}
      {error && <span role="alert">{error}</span>}
    </ScreenReaderOnly>
  );
}