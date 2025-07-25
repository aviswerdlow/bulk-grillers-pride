import { axe, toHaveNoViolations } from 'jest-axe';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Check for accessibility violations using axe-core
 * @param container - The HTML element to test
 * @param options - Optional axe configuration
 */
export async function expectNoA11yViolations(
  container: HTMLElement,
  options?: {
    rules?: Record<string, { enabled: boolean }>;
    runOnly?: string[];
  }
) {
  const results = await axe(container, options);
  expect(results).toHaveNoViolations();
}

/**
 * Verify that an element is keyboard focusable
 * @param element - The HTML element to test
 */
export function expectFocusable(element: HTMLElement) {
  // Check if element can receive focus
  expect(element).toHaveAttribute('tabindex');
  const tabIndex = element.getAttribute('tabindex');
  
  // Element should be focusable (tabindex >= 0) or naturally focusable
  if (tabIndex !== null) {
    expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0);
  }
  
  // Check if element is not disabled
  expect(element).not.toBeDisabled();
  
  // Check if element is visible
  expect(element).toBeVisible();
}

/**
 * Verify screen reader announcements using live regions
 * @param text - The expected announcement text
 * @param priority - The announcement priority (polite, assertive, or role)
 */
export async function expectAnnouncement(
  text: string,
  priority: 'polite' | 'assertive' | 'status' | 'alert' = 'polite'
) {
  let liveRegion: HTMLElement | null = null;
  
  switch (priority) {
    case 'polite':
      liveRegion = screen.queryByRole('status');
      if (!liveRegion) {
        const regions = screen.queryAllByLabelText(/live region/i);
        liveRegion = regions.find(r => r.getAttribute('aria-live') === 'polite') || null;
      }
      break;
    case 'assertive':
      liveRegion = screen.queryByRole('alert');
      if (!liveRegion) {
        const regions = screen.queryAllByLabelText(/live region/i);
        liveRegion = regions.find(r => r.getAttribute('aria-live') === 'assertive') || null;
      }
      break;
    case 'status':
      liveRegion = screen.queryByRole('status');
      break;
    case 'alert':
      liveRegion = screen.queryByRole('alert');
      break;
  }
  
  expect(liveRegion).toBeInTheDocument();
  if (liveRegion) {
    expect(liveRegion).toHaveTextContent(text);
  }
}

/**
 * Simulate keyboard navigation through a sequence of key presses
 * @param keys - Array of keyboard keys to press
 * @param startElement - Optional starting element for navigation
 */
export async function simulateKeyboardNavigation(
  keys: string[],
  startElement?: HTMLElement
) {
  const user = userEvent.setup();
  
  // Focus the starting element if provided
  if (startElement) {
    startElement.focus();
    expect(startElement).toHaveFocus();
  }
  
  // Navigate through the key sequence
  for (const key of keys) {
    await user.keyboard(key);
  }
  
  return user;
}

/**
 * Test focus trap behavior within a container
 * @param container - The container element with focus trap
 */
export async function testFocusTrap(container: HTMLElement) {
  const user = userEvent.setup();
  const focusableElements = within(container).getAllByRole('button', { hidden: false });
  
  // Ensure we have focusable elements
  expect(focusableElements.length).toBeGreaterThan(0);
  
  // Focus first element
  focusableElements[0]?.focus();
  expect(focusableElements[0]).toHaveFocus();
  
  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    await user.tab();
    expect(focusableElements[i]).toHaveFocus();
  }
  
  // Tab should wrap to first element
  await user.tab();
  expect(focusableElements[0]).toHaveFocus();
  
  // Shift+Tab should go to last element
  await user.tab({ shift: true });
  expect(focusableElements[focusableElements.length - 1]).toHaveFocus();
}

/**
 * Verify color contrast meets WCAG standards
 * Note: This is a helper that works with axe results
 * @param axeResults - Results from axe scan
 */
export function expectSufficientColorContrast(axeResults: any) {
  const contrastViolations = axeResults.violations.filter(
    (v: any) => v.id === 'color-contrast'
  );
  
  if (contrastViolations.length > 0) {
    const details = contrastViolations[0].nodes
      .map((node: any) => `Element: ${node.html}`)
      .join('\n');
    
    throw new Error(`Color contrast violations found:\n${details}`);
  }
}

/**
 * Test keyboard shortcuts and hotkeys
 * @param shortcuts - Object mapping shortcuts to expected outcomes
 */
export async function testKeyboardShortcuts(
  shortcuts: Record<string, () => void | Promise<void>>
) {
  const user = userEvent.setup();
  
  for (const [shortcut, verifyOutcome] of Object.entries(shortcuts)) {
    await user.keyboard(shortcut);
    await verifyOutcome();
  }
}

/**
 * Verify ARIA labels and descriptions
 * @param element - Element to check
 * @param expectedLabel - Expected accessible name
 * @param expectedDescription - Optional expected description
 */
export function expectAccessibleLabeling(
  element: HTMLElement,
  expectedLabel: string,
  expectedDescription?: string
) {
  // Check accessible name (from aria-label, aria-labelledby, or label element)
  expect(element).toHaveAccessibleName(expectedLabel);
  
  // Check accessible description if provided
  if (expectedDescription) {
    expect(element).toHaveAccessibleDescription(expectedDescription);
  }
}

/**
 * Test mobile touch target sizes (minimum 44x44 pixels)
 * @param element - Element to test
 */
export function expectSufficientTouchTarget(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const minSize = 44; // WCAG 2.1 Level AA requirement
  
  expect(rect.width).toBeGreaterThanOrEqual(minSize);
  expect(rect.height).toBeGreaterThanOrEqual(minSize);
}

/**
 * Verify heading hierarchy is logical
 * @param container - Container to check headings within
 */
export function expectLogicalHeadingOrder(container: HTMLElement) {
  const headings = within(container).getAllByRole('heading');
  let previousLevel = 0;
  
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    
    // Heading levels should not skip (e.g., h1 to h3)
    if (previousLevel > 0) {
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
    }
    
    previousLevel = level;
  });
}

/**
 * Test form validation announcements
 * @param input - Form input element
 * @param errorMessage - Expected error message
 */
export async function expectFormValidationAnnouncement(
  input: HTMLElement,
  errorMessage: string
) {
  // Check aria-invalid state
  expect(input).toHaveAttribute('aria-invalid', 'true');
  
  // Check error message association
  const describedBy = input.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  
  if (describedBy) {
    const errorElement = document.getElementById(describedBy);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(errorMessage);
    
    // Error should be in live region for announcement
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  }
}