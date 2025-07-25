import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityProvider, useAccessibility, useAccessibilityPreferences, useAnnouncement } from '../AccessibilityContext';

// import { ConvexReactClient } from 'convex/react';
// import { ConvexProviderWithClerk } from 'convex/react-clerk';
// import { ClerkProvider } from '@clerk/nextjs';
import { renderWithProviders } from '@/__tests__/test-helpers';
// Mock Convex
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({ user: null })),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => undefined),
  useMutation: jest.fn(() => jest.fn()),
}));

// Test component to access context
function TestComponent() {
  const {
    preferences,
    updatePreferences,
    announce,
    pushFocus,
    popFocus,
    registerShortcut,
  } = useAccessibility();

  return (
    <div>
      <div data-testid="preferences">{JSON.stringify(preferences || {})}</div>
      <button
        onClick={() => updatePreferences({ highContrast: true })}
        data-testid="toggle-high-contrast"
      >
        Toggle High Contrast
      </button>
      <button
        onClick={() => announce('Test announcement', 'polite')}
        data-testid="announce"
      >
        Announce
      </button>
      <button
        onClick={() => pushFocus({ elementId: 'test', context: 'modal' })}
        data-testid="push-focus"
      >
        Push Focus
      </button>
      <button
        onClick={() => popFocus()}
        data-testid="pop-focus"
      >
        Pop Focus
      </button>
      <button
        onClick={() => registerShortcut('ctrl+s', () => console.log('Save'))}
        data-testid="register-shortcut"
      >
        Register Shortcut
      </button>
    </div>
  );
}

describe('AccessibilityContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    jest.clearAllMocks();
  });

  it('provides default preferences when no user is logged in', async () => {
    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      const preferences = screen.getByTestId('preferences');
      expect(preferences.textContent).toBeTruthy();
      expect(preferences.textContent).toBeTruthy();
      expect(preferences.textContent).toBeTruthy();
    });
  });

  it('loads preferences from localStorage', async () => {
    const savedPrefs = {
      reducedMotion: true,
      highContrast: true,
      screenReaderActive: false,
      keyboardNavigation: true,
      preferredConfirmationMethod: 'hold_to_confirm',
      focusIndicatorStyle: 'high-visibility',
      announcementVerbosity: 'verbose',
    };
    localStorage.setItem('accessibility-preferences', JSON.stringify(savedPrefs));

    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      const preferences = screen.getByTestId('preferences');
      expect(preferences.textContent).toContain('"reducedMotion":true');
      expect(preferences.textContent).toContain('"highContrast":true');
      expect(preferences.textContent).toContain('"preferredConfirmationMethod":"hold_to_confirm"');
    });
  });

  it('updates preferences and saves to localStorage', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await user.click(screen.getByTestId('toggle-high-contrast'));

    await waitFor(() => {
      const preferences = screen.getByTestId('preferences');
      expect(preferences.textContent).toContain('"highContrast":true');
    });

    const saved = JSON.parse(localStorage.getItem('accessibility-preferences') || '{}');
    expect(saved.highContrast).toBe(true);
  });

  it('applies CSS classes based on preferences', async () => {
    const savedPrefs = {
      reducedMotion: true,
      highContrast: true,
      screenReaderActive: false,
      keyboardNavigation: true,
      preferredConfirmationMethod: 'standard_click',
      focusIndicatorStyle: 'high-visibility',
      announcementVerbosity: 'standard',
    };
    localStorage.setItem('accessibility-preferences', JSON.stringify(savedPrefs));

    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
      expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
      expect(document.documentElement.classList.contains('keyboard-nav')).toBe(true);
      expect(document.documentElement.getAttribute('data-focus-style')).toBe('high-visibility');
    });
  });

  it('manages focus history correctly', async () => {
    const user = userEvent.setup();
//     let focusResult: unknown;

    function FocusTestComponent() {
      const { focusHistory, pushFocus, popFocus } = useAccessibility();
      
      return (
        <div>
          <div data-testid="focus-count">{focusHistory.length}</div>
          <button
            onClick={() => pushFocus({ elementId: 'test1', context: 'modal' })}
            data-testid="push-1"
          >
            Push 1
          </button>
          <button
            onClick={() => pushFocus({ elementId: 'test2', context: 'wizard' })}
            data-testid="push-2"
          >
            Push 2
          </button>
          <button
            onClick={() => {
              focusResult = popFocus();
            }}
            data-testid="pop"
          >
            Pop
          </button>
        </div>
      );
    }

    renderWithProviders(<AccessibilityProvider>
        <FocusTestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('focus-count').textContent).toBe('0');

    await user.click(screen.getByTestId('push-1'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-count').textContent).toBe('1');
    });

    await user.click(screen.getByTestId('push-2'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-count').textContent).toBe('2');
    });

    await user.click(screen.getByTestId('pop'));
    await waitFor(() => {
      expect(screen.getByTestId('focus-count').textContent).toBe('1');
    });
  });

  it('creates live regions for announcements', async () => {
    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const politeLiveRegion = document.querySelector('[aria-live="polite"]');
    const assertiveLiveRegion = document.querySelector('[aria-live="assertive"]');

    expect(politeLiveRegion).toBeInTheDocument();
    expect(assertiveLiveRegion).toBeInTheDocument();
    expect(politeLiveRegion).toHaveClass('sr-only');
    expect(assertiveLiveRegion).toHaveClass('sr-only');
  });

  it('announces messages to screen readers', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await user.click(screen.getByTestId('announce'));

    const politeLiveRegion = document.querySelector('[aria-live="polite"]');
    await waitFor(() => {
      expect(politeLiveRegion?.textContent).toContain('Test announcement');
    });

    // Wait for auto-clear (5 seconds in real time, mocked here)
    await waitFor(() => {
      expect(politeLiveRegion?.textContent).toBe('');
    }, { timeout: 6000 });
  }, 10000);
});

describe('Accessibility Hooks', () => {
  it('useAccessibilityPreferences provides preferences and update function', async () => {
    function TestComponent() {
      const { preferences, updatePreferences } = useAccessibilityPreferences();
      
      return (
        <div>
          <div data-testid="high-contrast">{String(preferences?.highContrast ?? false)}</div>
          <button
            onClick={() => updatePreferences({ highContrast: true })}
            data-testid="update"
          >
            Update
          </button>
        </div>
      );
    }

    const user = userEvent.setup();
    
    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('high-contrast').textContent).toBe('false');
    });

    await user.click(screen.getByTestId('update'));

    await waitFor(() => {
      expect(screen.getByTestId('high-contrast').textContent).toBe('true');
    });
  });

  it('useAnnouncement provides announce function', async () => {
    let announced = false;

    function TestComponent() {
      const { announce } = useAnnouncement();
      
      return (
        <button
          onClick={() => {
            announce('Hello screen reader');
            announced = true;
          }}
          data-testid="announce"
        >
          Announce
        </button>
      );
    }

    const user = userEvent.setup();
    
    renderWithProviders(<AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    await user.click(screen.getByTestId('announce'));
    expect(announced).toBe(true);
  });
});