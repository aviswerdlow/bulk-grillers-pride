/**
 * Accessibility Module
 * 
 * This module provides functions for managing user accessibility preferences
 * and deletion session state management for the bulk-grillers-pride application.
 * 
 * Features:
 * - User accessibility preferences (reduced motion, high contrast, screen reader support, etc.)
 * - Deletion session management with focus state tracking
 * - Alternative confirmation method validation
 * - Session timeout and cleanup
 */

// Re-export all accessibility preferences functions
export {
  getAccessibilityPreferences,
  updateAccessibilityPreferences,
  getPreferencesByUserId,
  getDefaultPreferences,
} from './preferences';

// Re-export all deletion session functions
export {
  createDeletionSession,
  updateSessionFocus,
  validateConfirmation,
  getDeletionSession,
  updateSessionStep,
  completeDeletionSession,
  cancelDeletionSession,
  cleanupExpiredSessions,
} from './deletionSessions';

// Re-export types for convenience
export type {
  UserAccessibilityPreferences,
  DeletionSession,
  FocusState,
  PatternDefinition,
} from '../../types/accessibility';

export {
  ConfirmationMethod,
  SeverityLevel,
  DeletionStep,
  FocusIndicatorStyle,
  AnnouncementVerbosity,
  SessionState,
  FocusContext,
  SESSION_TIMEOUT_MS,
  SESSION_CLEANUP_INTERVAL_MS,
  isSessionExpired,
  generateSessionId,
} from '../../types/accessibility';