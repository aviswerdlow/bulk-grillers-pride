import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Comprehensive Accessibility Testing', () => {
  test.describe('Product Management Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication if needed
      await page.goto('/org/test-org/products');
    });

    test('product listing page should be fully accessible', async ({ page }) => {
      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should navigate product table with keyboard', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab');
      
      // Navigate through table headers
      const sortButtons = page.locator('[role="columnheader"] button');
      const count = await sortButtons.count();
      
      for (let i = 0; i < count; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        expect(focused).toContain('Sort by');
      }
      
      // Navigate to table rows
      await page.keyboard.press('Tab');
      const firstRow = await page.evaluate(() => document.activeElement?.getAttribute('role'));
      expect(firstRow).toBe('row');
    });

    test('should announce product selection to screen readers', async ({ page }) => {
      // Create live region monitor
      await page.evaluate(() => {
        const monitor = document.createElement('div');
        monitor.id = 'announcement-monitor';
        monitor.setAttribute('aria-live', 'polite');
        document.body.appendChild(monitor);
      });
      
      // Select a product
      await page.click('[data-testid="product-checkbox-1"]');
      
      // Check announcement
      const announcement = await page.locator('#announcement-monitor').textContent();
      expect(announcement).toContain('selected');
    });
  });

  test.describe('Delete Product Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/org/test-org/products');
      // Open delete dialog
      await page.click('[data-testid="product-actions-1"]');
      await page.click('[role="menuitem"]:has-text("Delete")');
    });

    test('delete dialog should trap focus', async ({ page }) => {
      // Check initial focus
      const initialFocus = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'H2']).toContain(initialFocus);
      
      // Tab through all focusable elements
      const focusableElements = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const element = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          text: document.activeElement?.textContent
        }));
        
        // Check if we've wrapped around
        if (focusableElements.some(el => el.text === element.text)) {
          break;
        }
        focusableElements.push(element);
      }
      
      // Verify focus stayed within dialog
      const dialogHasFocus = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement);
      });
      expect(dialogHasFocus).toBe(true);
    });

    test('should support alternative confirmation methods', async ({ page }) => {
      // Check for hold-to-confirm button
      const holdButton = page.locator('button:has-text("Hold to Delete")');
      
      if (await holdButton.isVisible()) {
        // Test hold interaction
        await holdButton.hover();
        await page.mouse.down();
        
        // Wait for progress
        await page.waitForTimeout(1000);
        
        // Check for progress announcement
        const progressAnnouncement = await page.locator('[role="progressbar"]').getAttribute('aria-valuenow');
        expect(parseInt(progressAnnouncement || '0')).toBeGreaterThan(0);
        
        await page.mouse.up();
      }
      
      // Check for type-to-confirm
      const confirmInput = page.locator('input[placeholder*="DELETE"]');
      
      if (await confirmInput.isVisible()) {
        await confirmInput.fill('DELETE');
        const deleteButton = page.locator('button:has-text("Delete"):not(:disabled)');
        await expect(deleteButton).toBeEnabled();
      }
    });
  });

  test.describe('Keyboard Navigation Patterns', () => {
    test('should support skip links', async ({ page }) => {
      await page.goto('/');
      
      // Focus skip link
      await page.keyboard.press('Tab');
      
      const skipLink = await page.evaluate(() => document.activeElement?.textContent);
      expect(skipLink).toContain('Skip to');
      
      // Activate skip link
      await page.keyboard.press('Enter');
      
      // Check focus moved to main content
      const mainContent = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main?.contains(document.activeElement);
      });
      expect(mainContent).toBe(true);
    });

    test('should have consistent tab order', async ({ page }) => {
      await page.goto('/org/test-org/dashboard');
      
      const tabOrder = [];
      
      // Tab through entire page
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('Tab');
        
        const element = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName,
            role: el?.getAttribute('role'),
            label: el?.getAttribute('aria-label') || el?.textContent?.trim().substring(0, 30)
          };
        });
        
        // Stop if we've looped back
        if (tabOrder.some(e => e.label === element.label)) break;
        
        tabOrder.push(element);
      }
      
      // Verify logical order (navigation before main content, etc.)
      const navIndex = tabOrder.findIndex(el => el.role === 'navigation');
      const mainIndex = tabOrder.findIndex(el => el.tag === 'MAIN' || el.role === 'main');
      
      expect(navIndex).toBeLessThan(mainIndex);
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper landmarks', async ({ page }) => {
      await page.goto('/org/test-org/dashboard');
      
      // Check for required landmarks
      const landmarks = await page.evaluate(() => {
        return {
          banner: document.querySelector('[role="banner"]') !== null,
          navigation: document.querySelector('[role="navigation"]') !== null,
          main: document.querySelector('[role="main"], main') !== null,
          contentinfo: document.querySelector('[role="contentinfo"]') !== null
        };
      });
      
      expect(landmarks.navigation).toBe(true);
      expect(landmarks.main).toBe(true);
    });

    test('should have descriptive page titles', async ({ page }) => {
      const pages = [
        { url: '/org/test-org/dashboard', expectedTitle: /dashboard/i },
        { url: '/org/test-org/products', expectedTitle: /products/i },
        { url: '/org/test-org/categories', expectedTitle: /categories/i }
      ];
      
      for (const { url, expectedTitle } of pages) {
        await page.goto(url);
        await expect(page).toHaveTitle(expectedTitle);
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto('/org/test-org/products');
      
      // Set up mutation observer for live regions
      const announcements = await page.evaluate(() => {
        const announcements: string[] = [];
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.target instanceof Element) {
              const liveRegion = mutation.target.closest('[aria-live]');
              if (liveRegion && liveRegion.textContent) {
                announcements.push(liveRegion.textContent);
              }
            }
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
        
        window.announcements = announcements;
        return announcements;
      });
      
      // Trigger a dynamic update (e.g., add to cart)
      await page.click('[data-testid="add-product-button"]');
      await page.waitForTimeout(500);
      
      // Check for announcement
      const capturedAnnouncements = await page.evaluate(() => window.announcements);
      expect(capturedAnnouncements.length).toBeGreaterThan(0);
    });
  });

  test.describe('Visual Accessibility', () => {
    test('should support zoom up to 200%', async ({ page }) => {
      await page.goto('/org/test-org/dashboard');
      
      // Set zoom to 200%
      await page.evaluate(() => {
        document.documentElement.style.zoom = '2';
      });
      
      // Check that content is still accessible
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
      
      // Check no horizontal scroll at 1280px width
      await page.setViewportSize({ width: 1280, height: 720 });
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
      
      // Reset zoom
      await page.evaluate(() => {
        document.documentElement.style.zoom = '1';
      });
    });

    test('should work with high contrast mode', async ({ page }) => {
      await page.goto('/org/test-org/dashboard');
      
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      // Take screenshot for manual verification
      await page.screenshot({ path: 'high-contrast-mode.png' });
      
      // Check that interactive elements are still visible
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
      
      // Verify borders are visible in high contrast
      const firstButton = buttons.first();
      const borderWidth = await firstButton.evaluate((el) => {
        return window.getComputedStyle(el).borderWidth;
      });
      expect(parseInt(borderWidth)).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.use({ viewport: { width: 375, height: 667 } });
    
    test('should have adequate touch targets', async ({ page }) => {
      await page.goto('/org/test-org/dashboard');
      
      // Check all interactive elements
      const interactiveElements = page.locator('button, a, input, select, textarea, [role="button"]');
      const elements = await interactiveElements.all();
      
      for (const element of elements) {
        const box = await element.boundingBox();
        if (box) {
          // WCAG 2.1 requires 44x44 pixel touch targets
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should not require horizontal scrolling', async ({ page }) => {
      await page.goto('/org/test-org/products');
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have accessible form validation', async ({ page }) => {
      await page.goto('/org/test-org/products/manage');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Check for error messages
      const errors = page.locator('[role="alert"]');
      const errorCount = await errors.count();
      expect(errorCount).toBeGreaterThan(0);
      
      // Check that errors are associated with inputs
      const firstError = errors.first();
      const errorId = await firstError.getAttribute('id');
      
      const associatedInput = page.locator(`[aria-describedby="${errorId}"]`);
      await expect(associatedInput).toBeVisible();
      
      // Check that invalid inputs have aria-invalid
      const invalidInputs = page.locator('[aria-invalid="true"]');
      const invalidCount = await invalidInputs.count();
      expect(invalidCount).toBeGreaterThan(0);
    });

    test('should support autocomplete attributes', async ({ page }) => {
      await page.goto('/sign-up');
      
      // Check for autocomplete attributes
      const emailInput = page.locator('input[type="email"]');
      const autocomplete = await emailInput.getAttribute('autocomplete');
      expect(autocomplete).toBeTruthy();
      
      // Common autocomplete values
      const validAutocompleteValues = ['email', 'username', 'new-password', 'current-password', 'name'];
      expect(validAutocompleteValues).toContain(autocomplete);
    });
  });
});

// Type declaration for window.announcements
declare global {
  interface Window {
    announcements: string[];
  }
}