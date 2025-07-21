import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FocusTrapManager, DialogFocusTrap } from '../FocusTrapManager';
import { AccessibilityProvider } from '@/contexts/accessibility';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

describe('FocusTrapManager', () => {
  beforeEach(() => {
    // Clear focus
    (document.activeElement as HTMLElement)?.blur();
  });

  it('traps focus when active', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <button data-testid="outside-before">Outside Before</button>
        <FocusTrapManager active={true}>
          <div>
            <button data-testid="inside-1">Inside 1</button>
            <button data-testid="inside-2">Inside 2</button>
          </div>
        </FocusTrapManager>
        <button data-testid="outside-after">Outside After</button>
      </TestWrapper>
    );

    // Focus should move to first element inside trap
    await waitFor(() => {
      expect(screen.getByTestId('inside-1')).toHaveFocus();
    });

    // Tab should cycle within trap
    await user.tab();
    expect(screen.getByTestId('inside-2')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('inside-1')).toHaveFocus();

    // Shift+Tab should cycle backwards
    await user.tab({ shift: true });
    expect(screen.getByTestId('inside-2')).toHaveFocus();
  });

  it('does not trap focus when inactive', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <button data-testid="outside-before">Outside Before</button>
        <FocusTrapManager active={false}>
          <div>
            <button data-testid="inside-1">Inside 1</button>
            <button data-testid="inside-2">Inside 2</button>
          </div>
        </FocusTrapManager>
        <button data-testid="outside-after">Outside After</button>
      </TestWrapper>
    );

    // Focus outside button
    screen.getByTestId('outside-before').focus();
    expect(screen.getByTestId('outside-before')).toHaveFocus();

    // Tab should move through all elements normally
    await user.tab();
    expect(screen.getByTestId('inside-1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('inside-2')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('outside-after')).toHaveFocus();
  });

  it('calls onEscapeKey when Escape is pressed', async () => {
    const onEscapeKey = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <FocusTrapManager active={true} onEscapeKey={onEscapeKey}>
          <button data-testid="inside">Inside</button>
        </FocusTrapManager>
      </TestWrapper>
    );

    await user.keyboard('{Escape}');
    expect(onEscapeKey).toHaveBeenCalledTimes(1);
  });

  it('saves and restores focus', async () => {
    const { rerender } = render(
      <TestWrapper>
        <button data-testid="trigger">Trigger</button>
        <FocusTrapManager active={false} restoreFocus={true}>
          <button data-testid="inside">Inside</button>
        </FocusTrapManager>
      </TestWrapper>
    );

    // Focus trigger button
    screen.getByTestId('trigger').focus();
    expect(screen.getByTestId('trigger')).toHaveFocus();

    // Activate trap
    rerender(
      <TestWrapper>
        <button data-testid="trigger">Trigger</button>
        <FocusTrapManager active={true} restoreFocus={true}>
          <button data-testid="inside">Inside</button>
        </FocusTrapManager>
      </TestWrapper>
    );

    // Focus should move to trap
    await waitFor(() => {
      expect(screen.getByTestId('inside')).toHaveFocus();
    });

    // Deactivate trap
    rerender(
      <TestWrapper>
        <button data-testid="trigger">Trigger</button>
        <FocusTrapManager active={false} restoreFocus={true}>
          <button data-testid="inside">Inside</button>
        </FocusTrapManager>
      </TestWrapper>
    );

    // Focus should restore to trigger
    await waitFor(() => {
      expect(screen.getByTestId('trigger')).toHaveFocus();
    });
  });

  it('announces on activate and deactivate', async () => {
    const { rerender } = render(
      <TestWrapper>
        <FocusTrapManager
          active={false}
          announceOnActivate="Dialog opened"
          announceOnDeactivate="Dialog closed"
        >
          <button>Inside</button>
        </FocusTrapManager>
      </TestWrapper>
    );

    // Check for live regions
    const politeLiveRegion = document.querySelector('[aria-live="polite"]');
    const assertiveLiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(politeLiveRegion).toBeInTheDocument();
    expect(assertiveLiveRegion).toBeInTheDocument();

    // Activate trap
    rerender(
      <TestWrapper>
        <FocusTrapManager
          active={true}
          announceOnActivate="Dialog opened"
          announceOnDeactivate="Dialog closed"
        >
          <button>Inside</button>
        </FocusTrapManager>
      </TestWrapper>
    );

    // Check for announcement
    await waitFor(() => {
      expect(assertiveLiveRegion?.textContent).toContain('Dialog opened');
    });
  });
});

describe('DialogFocusTrap', () => {
  it('provides dialog-specific focus trap', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <DialogFocusTrap open={true} onClose={onClose} dialogTitle="Test Dialog">
          <div>
            <h2>Test Dialog</h2>
            <button data-testid="close">Close</button>
          </div>
        </DialogFocusTrap>
      </TestWrapper>
    );

    // Press Escape
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    // Check for announcement
    const assertiveLiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(assertiveLiveRegion?.textContent).toContain('Test Dialog dialog opened');
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <DialogFocusTrap open={false} onClose={jest.fn()}>
          <div data-testid="dialog-content">Content</div>
        </DialogFocusTrap>
      </TestWrapper>
    );

    expect(screen.queryByTestId('dialog-content')).toBeInTheDocument();
    expect(document.querySelector('[data-focus-trap-active]')).not.toBeInTheDocument();
  });
});