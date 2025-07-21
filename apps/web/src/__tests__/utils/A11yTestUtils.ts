/**
 * A11yTestUtils - Comprehensive accessibility testing utilities
 * 
 * This class provides methods for testing various accessibility features including:
 * - Keyboard navigation
 * - Screen reader announcements
 * - Pattern visibility
 * - Focus management
 * - Color contrast
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';

// Note: jest-axe integration can be added when the package is installed
// For now, we'll use manual contrast checking and axe-core from Playwright tests

export interface KeyboardNavigationOptions {
  startElement?: HTMLElement;
  expectedOrder?: string[];
  skipHidden?: boolean;
  includeDisabled?: boolean;
}

export interface AnnouncementOptions {
  timeout?: number;
  region?: 'polite' | 'assertive' | 'status';
  exact?: boolean;
}

export interface FocusTrapOptions {
  container: HTMLElement;
  allowOutsideFocus?: boolean;
  returnFocusOnDeactivate?: boolean;
}

export interface ColorContrastOptions {
  standard?: 'AA' | 'AAA';
  includeBackgrounds?: boolean;
  excludeElements?: string[];
}

export class A11yTestUtils {
  /**
   * Test keyboard navigation flow through interactive elements
   */
  static async testKeyboardNavigation(
    component: ReactElement,
    options: KeyboardNavigationOptions = {}
  ): Promise<void> {
    const { container } = render(component);
    const user = userEvent.setup();
    
    // Get all focusable elements
    const focusableElements = this.getFocusableElements(container, options);
    
    if (options.expectedOrder) {
      // Test specific order
      for (let i = 0; i < options.expectedOrder.length; i++) {
        await user.tab();
        const activeElement = document.activeElement;
        
        expect(activeElement).toBeDefined();
        expect(activeElement?.getAttribute('data-testid') || activeElement?.textContent)
          .toBe(options.expectedOrder[i]);
      }
    } else {
      // Test that all focusable elements can be reached
      const focusedElements = new Set<Element>();
      
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        const activeElement = document.activeElement;
        
        if (activeElement) {
          focusedElements.add(activeElement);
        }
      }
      
      expect(focusedElements.size).toBe(focusableElements.length);
    }
    
    // Test reverse navigation
    for (let i = 0; i < focusableElements.length; i++) {
      await user.keyboard('{Shift>}{Tab}{/Shift}');
    }
    
    // Test escape key handling
    await user.keyboard('{Escape}');
  }

  /**
   * Test screen reader announcements
   */
  static async testScreenReaderAnnouncements(
    action: () => void | Promise<void>,
    expectedAnnouncement: string | RegExp,
    options: AnnouncementOptions = {}
  ): Promise<void> {
    const { timeout = 1000, region = 'polite', exact = false } = options;
    
    // Create live region if it doesn't exist
    let liveRegion = document.querySelector(`[aria-live="${region}"]`);
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', region);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('data-testid', `live-region-${region}`);
      document.body.appendChild(liveRegion);
    }
    
    // Execute action
    await action();
    
    // Wait for announcement
    await waitFor(() => {
      const announcement = liveRegion?.textContent || '';
      
      if (exact) {
        expect(announcement).toBe(expectedAnnouncement);
      } else if (expectedAnnouncement instanceof RegExp) {
        expect(announcement).toMatch(expectedAnnouncement);
      } else {
        expect(announcement).toContain(expectedAnnouncement);
      }
    }, { timeout });
  }

  /**
   * Test pattern visibility for colorblind users
   */
  static async testPatternVisibility(
    element: HTMLElement,
    patternType: 'dots' | 'stripes' | 'grid' | 'custom'
  ): Promise<void> {
    const computedStyle = window.getComputedStyle(element);
    
    // Check for background pattern
    const backgroundImage = computedStyle.backgroundImage;
    expect(backgroundImage).not.toBe('none');
    
    // Check for appropriate contrast
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;
    
    if (backgroundColor && color) {
      const contrast = this.calculateColorContrast(backgroundColor, color);
      expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
    }
    
    // Check for pattern-specific attributes
    switch (patternType) {
      case 'dots':
        expect(backgroundImage).toMatch(/radial-gradient|dot/i);
        break;
      case 'stripes':
        expect(backgroundImage).toMatch(/linear-gradient|stripe/i);
        break;
      case 'grid':
        expect(backgroundImage).toMatch(/grid|cross/i);
        break;
      case 'custom':
        expect(element.getAttribute('data-pattern')).toBeTruthy();
        break;
    }
    
    // Check for texture description
    const ariaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    expect(ariaLabel || ariaDescribedBy).toBeTruthy();
  }

  /**
   * Test focus trap behavior
   */
  static async testFocusTrap(options: FocusTrapOptions): Promise<void> {
    const { container, allowOutsideFocus = false } = options;
    const user = userEvent.setup();
    
    // Get focusable elements within container
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      throw new Error('No focusable elements found in container');
    }
    
    // Focus first element
    focusableElements[0].focus();
    expect(document.activeElement).toBe(focusableElements[0]);
    
    // Tab through all elements
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab();
    }
    
    // After last element, focus should wrap to first
    expect(document.activeElement).toBe(focusableElements[0]);
    
    // Test reverse tabbing
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1]);
    
    // Test outside focus attempt
    if (!allowOutsideFocus) {
      const outsideElement = document.createElement('button');
      document.body.appendChild(outsideElement);
      
      outsideElement.focus();
      expect(container.contains(document.activeElement)).toBe(true);
      
      document.body.removeChild(outsideElement);
    }
  }

  /**
   * Test color contrast compliance
   */
  static async testColorContrast(
    component: ReactElement,
    options: ColorContrastOptions = {}
  ): Promise<void> {
    const { container } = render(component);
    const { standard = 'AA', excludeElements = [] } = options;
    
    // Manual contrast checks for all text elements
    const textElements = container.querySelectorAll('*:not(script):not(style)');
    const failures: Array<{element: Element, contrast: number, required: number}> = [];
    
    textElements.forEach(element => {
      // Skip excluded elements
      const isExcluded = excludeElements.some(selector => 
        element.matches(selector) || element.closest(selector)
      );
      
      if (isExcluded) return;
      
      if (element.textContent && element.textContent.trim()) {
        const computedStyle = window.getComputedStyle(element as HTMLElement);
        const backgroundColor = this.getEffectiveBackgroundColor(element as HTMLElement);
        const color = computedStyle.color;
        
        if (backgroundColor && backgroundColor !== 'transparent' && color) {
          const contrast = this.calculateColorContrast(backgroundColor, color);
          const fontSize = parseFloat(computedStyle.fontSize);
          const fontWeight = computedStyle.fontWeight;
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight) >= 700);
          
          let requiredContrast: number;
          if (standard === 'AAA') {
            requiredContrast = isLargeText ? 4.5 : 7;
          } else {
            requiredContrast = isLargeText ? 3 : 4.5;
          }
          
          if (contrast < requiredContrast) {
            failures.push({ element, contrast, required: requiredContrast });
          }
        }
      }
    });
    
    if (failures.length > 0) {
      const failureMessages = failures.map(f => 
        `Element "${f.element.textContent?.substring(0, 20)}..." has contrast ${f.contrast.toFixed(2)} (required: ${f.required})`
      );
      throw new Error(`Color contrast failures:\n${failureMessages.join('\n')}`);
    }
  }

  /**
   * Helper: Get all focusable elements
   */
  private static getFocusableElements(
    container: HTMLElement,
    options: Partial<KeyboardNavigationOptions> = {}
  ): HTMLElement[] {
    const { skipHidden = true, includeDisabled = false } = options;
    
    const selector = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      'details',
      'summary'
    ].join(', ');
    
    const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
    
    return elements.filter(element => {
      // Skip hidden elements
      if (skipHidden && (element.hidden || element.style.display === 'none')) {
        return false;
      }
      
      // Skip disabled elements unless specified
      if (!includeDisabled && element.hasAttribute('disabled')) {
        return false;
      }
      
      // Check if element is visible
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  /**
   * Helper: Calculate color contrast ratio
   */
  private static calculateColorContrast(color1: string, color2: string): number {
    // Convert colors to RGB
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    // Calculate relative luminance
    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);
    
    // Calculate contrast ratio
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Helper: Parse color string to RGB
   */
  private static parseColor(color: string): [number, number, number] {
    // Handle rgb/rgba format
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1], 10),
        parseInt(rgbMatch[2], 10),
        parseInt(rgbMatch[3], 10)
      ];
    }
    
    // Handle hex format
    const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16)
      ];
    }
    
    // Default to black if parsing fails
    return [0, 0, 0];
  }

  /**
   * Helper: Calculate relative luminance
   */
  private static getRelativeLuminance([r, g, b]: [number, number, number]): number {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;
    
    const r2 = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g2 = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b2 = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
    
    return 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
  }

  /**
   * Helper: Get effective background color (traversing up the DOM if needed)
   */
  private static getEffectiveBackgroundColor(element: HTMLElement): string {
    let currentElement: HTMLElement | null = element;
    
    while (currentElement) {
      const computedStyle = window.getComputedStyle(currentElement);
      const backgroundColor = computedStyle.backgroundColor;
      
      if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        return backgroundColor;
      }
      
      currentElement = currentElement.parentElement;
    }
    
    // Default to white if no background color found
    return 'rgb(255, 255, 255)';
  }

  /**
   * Test ARIA attributes and semantics
   */
  static async testAriaSemantics(element: HTMLElement): Promise<void> {
    // Check for required ARIA attributes based on role
    const role = element.getAttribute('role');
    
    if (role) {
      switch (role) {
        case 'button':
          expect(element.getAttribute('aria-label') || element.textContent?.trim()).toBeTruthy();
          break;
        case 'navigation':
          expect(element.getAttribute('aria-label')).toBeTruthy();
          break;
        case 'region':
          expect(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')).toBeTruthy();
          break;
        case 'alert':
        case 'status':
          expect(element.getAttribute('aria-live')).toBeTruthy();
          break;
      }
    }
    
    // Check for proper heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1), 10);
      expect(level - lastLevel).toBeLessThanOrEqual(1);
      lastLevel = level;
    });
  }

  /**
   * Test focus restoration after modal/dialog close
   */
  static async testFocusRestoration(
    triggerElement: HTMLElement,
    openAction: () => void | Promise<void>,
    closeAction: () => void | Promise<void>
  ): Promise<void> {
    // Focus trigger element
    triggerElement.focus();
    expect(document.activeElement).toBe(triggerElement);
    
    // Open modal/dialog
    await openAction();
    
    // Focus should move to modal/dialog
    expect(document.activeElement).not.toBe(triggerElement);
    
    // Close modal/dialog
    await closeAction();
    
    // Focus should return to trigger element
    await waitFor(() => {
      expect(document.activeElement).toBe(triggerElement);
    });
  }
}

export default A11yTestUtils;