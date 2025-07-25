import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('landing page should not have accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('sign-in page should not have accessibility violations', async ({ page }) => {
    await page.goto('/sign-in');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('.clerk-internal-*') // Exclude Clerk's internal components
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('sign-up page should not have accessibility violations', async ({ page }) => {
    await page.goto('/sign-up');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .exclude('.clerk-internal-*') // Exclude Clerk's internal components
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper keyboard navigation on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Start from the top of the page
    await page.keyboard.press('Tab');
    
    // First tab should focus on skip link or first interactive element
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON']).toContain(firstFocused);
    
    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to activate links with Enter
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    if (focusedElement?.includes('Sign')) {
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/.*sign-(in|up)/);
    }
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Check email input has label
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
    
    // Check password input has label
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    await expect(passwordInput).toBeVisible();
    
    // Check submit button has accessible name
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();
  });

  test.skip('dashboard should support screen reader landmarks', async ({ page }) => {
    // This test requires authentication
    await page.goto('/org/test-org/dashboard');
    
    // Check for main navigation landmark
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Check for main content landmark
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
    
    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
  });

  test('color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'color-contrast'])
      .analyze();
    
    // Filter out only color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(colorContrastViolations).toEqual([]);
  });
});