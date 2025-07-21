import { Id } from '../_generated/dataModel';

// Confirmation method enum
export enum ConfirmationMethod {
  STANDARD_CLICK = 'standard_click',
  HOLD_TO_CONFIRM = 'hold_to_confirm',
  TYPE_TO_CONFIRM = 'type_to_confirm',
  BIOMETRIC = 'biometric',
  VOICE = 'voice',
  PATTERN_DRAW = 'pattern_draw'
}

// Severity level enum
export enum SeverityLevel {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
  CRITICAL = 'critical'
}

// Deletion step enum
export enum DeletionStep {
  REVIEW_CONSEQUENCES = 'review_consequences',
  SELECT_OPTIONS = 'select_options',
  CONFIRM = 'confirm',
  PROCESSING = 'processing',
  COMPLETE = 'complete'
}

// Focus indicator style enum
export enum FocusIndicatorStyle {
  DEFAULT = 'default',
  HIGH_VISIBILITY = 'high-visibility',
  CUSTOM = 'custom'
}

// Announcement verbosity enum
export enum AnnouncementVerbosity {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  VERBOSE = 'verbose'
}

// Session state enum
export enum SessionState {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Focus context enum
export enum FocusContext {
  MODAL = 'modal',
  WIZARD = 'wizard',
  TABLE = 'table',
  FORM = 'form'
}

// User accessibility preferences interface
export interface UserAccessibilityPreferences {
  userId: Id<'users'>;
  preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
    screenReaderActive: boolean;
    keyboardNavigation: boolean;
    preferredConfirmationMethod: ConfirmationMethod;
    focusIndicatorStyle: FocusIndicatorStyle;
    announcementVerbosity: AnnouncementVerbosity;
  };
  createdAt: number;
  updatedAt: number;
}

// Deletion session interface
export interface DeletionSession {
  sessionId: string;
  userId: Id<'users'>;
  organizationId: Id<'organizations'>;
  state: SessionState;
  currentStep: DeletionStep;
  selectedProducts: Id<'products'>[];
  confirmationMethod: ConfirmationMethod;
  startedAt: number;
  completedAt?: number;
  lastActivityAt: number;
  focusHistory: FocusState[];
}

// Focus state interface
export interface FocusState {
  elementId: string;
  timestamp: number;
  context: FocusContext;
  scrollPosition?: {
    x: number;
    y: number;
  };
}

// Pattern definition interface (for frontend use)
export interface PatternDefinition {
  id: string;
  name: string;
  severity: SeverityLevel;
  svgPattern: string;
  highContrastVariant: string;
  colorScheme: {
    primary: string;
    secondary: string;
    highContrast: {
      primary: string;
      secondary: string;
    };
  };
  textureDescription: string;
}

// Validation data types for different confirmation methods
export interface TypeConfirmationData {
  userInput: string;
  expectedText: string;
}

export interface HoldConfirmationData {
  holdDuration: number; // milliseconds
  requiredDuration: number; // milliseconds
}

export interface BiometricConfirmationData {
  authResult: boolean;
  authMethod: 'fingerprint' | 'face' | 'voice';
  deviceSupported: boolean;
}

export interface PatternConfirmationData {
  drawnPattern: number[]; // Array of point indices
  expectedPattern: number[];
}

// Session expiry constants
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Helper function to check if session is expired
export function isSessionExpired(lastActivityAt: number): boolean {
  return Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
}

// Helper function to generate session ID
export function generateSessionId(): string {
  return `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}