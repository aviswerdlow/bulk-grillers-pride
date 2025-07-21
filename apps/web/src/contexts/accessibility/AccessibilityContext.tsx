'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

// Types based on the architecture document
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

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences | null;
  isLoading: boolean;
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => Promise<void>;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  clearAnnouncements: () => void;
  focusHistory: FocusState[];
  pushFocus: (state: Omit<FocusState, 'timestamp'>) => void;
  popFocus: () => FocusState | undefined;
  modalStack: string[];
  pushModal: (modalId: string) => void;
  popModal: () => string | undefined;
  keyboardShortcuts: Map<string, () => void>;
  registerShortcut: (key: string, handler: () => void) => void;
  unregisterShortcut: (key: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const defaultPreferences: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  screenReaderActive: false,
  keyboardNavigation: false,
  preferredConfirmationMethod: 'standard_click',
  focusIndicatorStyle: 'default',
  announcementVerbosity: 'standard',
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<AccessibilityPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [focusHistory, setFocusHistory] = useState<FocusState[]>([]);
  const [modalStack, setModalStack] = useState<string[]>([]);
  const keyboardShortcuts = useRef(new Map<string, () => void>());
  const announcementIdCounter = useRef(0);

  // Convex hooks
  const storedPreferences = useQuery(api.functions.accessibility.preferences.getAccessibilityPreferences);
  const updatePreferencesMutation = useMutation(api.functions.accessibility.preferences.updateAccessibilityPreferences);

  // Load preferences from backend or local storage
  useEffect(() => {
    if (storedPreferences !== undefined) {
      setPreferences(storedPreferences?.preferences || defaultPreferences);
      setIsLoading(false);
    } else if (!user) {
      // Load from local storage for unauthenticated users
      const localPrefs = localStorage.getItem('accessibility-preferences');
      if (localPrefs) {
        try {
          setPreferences(JSON.parse(localPrefs));
        } catch {
          setPreferences(defaultPreferences);
        }
      } else {
        setPreferences(defaultPreferences);
      }
      setIsLoading(false);
    }
  }, [storedPreferences, user]);

  // Apply CSS classes based on preferences
  useEffect(() => {
    if (!preferences) return;

    const root = document.documentElement;
    
    // Apply preference classes
    root.classList.toggle('reduced-motion', preferences.reducedMotion);
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('keyboard-nav', preferences.keyboardNavigation);
    
    // Apply focus indicator style
    root.setAttribute('data-focus-style', preferences.focusIndicatorStyle);
    
    // Set CSS custom properties for high contrast
    if (preferences.highContrast) {
      root.style.setProperty('--contrast-ratio', '7');
    } else {
      root.style.removeProperty('--contrast-ratio');
    }
  }, [preferences]);

  // Update preferences with debounced backend sync
  const updatePreferencesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updatePreferences = useCallback(async (updates: Partial<AccessibilityPreferences>) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    // Save to local storage immediately
    localStorage.setItem('accessibility-preferences', JSON.stringify(newPreferences));

    // Debounce backend sync
    if (updatePreferencesTimeoutRef.current) {
      clearTimeout(updatePreferencesTimeoutRef.current);
    }

    updatePreferencesTimeoutRef.current = setTimeout(async () => {
      if (user) {
        try {
          await updatePreferencesMutation({ preferences: newPreferences });
        } catch (error) {
          console.error('Failed to update accessibility preferences:', error);
        }
      }
    }, 500);
  }, [preferences, user, updatePreferencesMutation]);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: Announcement = {
      id: `announcement-${announcementIdCounter.current++}`,
      message,
      priority,
      timestamp: Date.now(),
    };
    
    setAnnouncements(prev => [...prev, announcement]);
    
    // Auto-clear old announcements after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  }, []);

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  // Focus management
  const pushFocus = useCallback((state: Omit<FocusState, 'timestamp'>) => {
    const focusState: FocusState = {
      ...state,
      timestamp: Date.now(),
    };
    setFocusHistory(prev => [...prev, focusState]);
  }, []);

  const popFocus = useCallback(() => {
    let lastFocus: FocusState | undefined;
    setFocusHistory(prev => {
      const newHistory = [...prev];
      lastFocus = newHistory.pop();
      return newHistory;
    });
    return lastFocus;
  }, []);

  // Modal stack management
  const pushModal = useCallback((modalId: string) => {
    setModalStack(prev => [...prev, modalId]);
  }, []);

  const popModal = useCallback(() => {
    let lastModal: string | undefined;
    setModalStack(prev => {
      const newStack = [...prev];
      lastModal = newStack.pop();
      return newStack;
    });
    return lastModal;
  }, []);

  // Keyboard shortcuts
  const registerShortcut = useCallback((key: string, handler: () => void) => {
    keyboardShortcuts.current.set(key, handler);
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    keyboardShortcuts.current.delete(key);
  }, []);

  // Global keyboard handler
  useEffect(() => {
    if (!preferences?.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.altKey ? 'alt+' : ''}${e.key.toLowerCase()}`;
      const handler = keyboardShortcuts.current.get(key);
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preferences?.keyboardNavigation]);

  const value = useMemo(() => ({
    preferences,
    isLoading,
    updatePreferences,
    announce,
    clearAnnouncements,
    focusHistory,
    pushFocus,
    popFocus,
    modalStack,
    pushModal,
    popModal,
    keyboardShortcuts: keyboardShortcuts.current,
    registerShortcut,
    unregisterShortcut,
  }), [
    preferences,
    isLoading,
    updatePreferences,
    announce,
    clearAnnouncements,
    focusHistory,
    pushFocus,
    popFocus,
    modalStack,
    pushModal,
    popModal,
    registerShortcut,
    unregisterShortcut,
  ]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcements
          .filter(a => a.priority === 'polite')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcements
          .filter(a => a.priority === 'assertive')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
    </AccessibilityContext.Provider>
  );
}

// Main hook
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

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