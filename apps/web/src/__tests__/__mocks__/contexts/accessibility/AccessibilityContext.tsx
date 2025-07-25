'use client';

import React, { createContext, useContext } from 'react';

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderActive: boolean;
  keyboardNavigation: boolean;
  preferredConfirmationMethod: string;
  focusIndicatorStyle: string;
  announcementVerbosity: string;
}

export interface FocusState {
  elementId: string;
  timestamp: number;
  context: 'modal' | 'wizard' | 'table' | 'form';
  scrollPosition?: { x: number; y: number };
}

export interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

const mockPreferences: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  screenReaderActive: false,
  keyboardNavigation: false,
  preferredConfirmationMethod: 'button',
  focusIndicatorStyle: 'default',
  announcementVerbosity: 'normal',
};

const mockContextValue = {
  preferences: mockPreferences,
  isLoading: false,
  updatePreferences: jest.fn().mockResolvedValue(undefined),
  announce: jest.fn(),
  clearAnnouncements: jest.fn(),
  focusHistory: [],
  pushFocus: jest.fn(),
  popFocus: jest.fn(),
  modalStack: [],
  pushModal: jest.fn(),
  popModal: jest.fn(),
  keyboardShortcuts: new Map(),
  registerShortcut: jest.fn(),
  unregisterShortcut: jest.fn(),
};

const AccessibilityContext = createContext(mockContextValue);

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AccessibilityContext.Provider value={mockContextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// Convenience hooks
export function useAccessibilityPreferences() {
  const { preferences, updatePreferences } = useAccessibility();
  return { preferences, updatePreferences };
}

export function useAnnouncement() {
  const { announce, clearAnnouncements } = useAccessibility();
  return { announce, clearAnnouncements };
}

export function useFocusManagement() {
  const { focusHistory, pushFocus, popFocus } = useAccessibility();
  return { focusHistory, pushFocus, popFocus };
}

export function usePatternTheme() {
  const { preferences } = useAccessibility();
  return {
    highContrast: preferences?.highContrast || false,
    reducedMotion: preferences?.reducedMotion || false,
  };
}

// Export mock functions for testing
export const mockUpdatePreferences = mockContextValue.updatePreferences;
export const mockAnnounce = mockContextValue.announce;
export const mockPushFocus = mockContextValue.pushFocus;
export const mockPopFocus = mockContextValue.popFocus;
export const mockPushModal = mockContextValue.pushModal;
export const mockPopModal = mockContextValue.popModal;

// Default export for compatibility
export default {
  AccessibilityProvider,
  useAccessibility,
  useAccessibilityPreferences,
  useAnnouncement,
  useFocusManagement,
  usePatternTheme,
};