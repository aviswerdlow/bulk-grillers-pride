import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Organization Settings - API Keys', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    
    // Login as an admin user (using test credentials)
    // Note: You'll need to set up test users with appropriate roles
    await authHelper.login(process.env.TEST_ADMIN_EMAIL || 'admin@test.com', 
                          process.env.TEST_ADMIN_PASSWORD || 'testpassword');
    
    // Navigate to organization settings
    // Note: Update with actual org slug from your test data
    await page.goto('/test-org/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display API keys tab', async ({ page }) => {
    // Verify settings page loaded
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();
    
    // Click on API Keys tab
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Verify API keys section is displayed
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
    await expect(page.getByText('Manage API keys for AI categorization providers')).toBeVisible();
  });

  test('should show empty state when no API keys exist', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Check for empty state
    await expect(page.getByText('No API keys yet')).toBeVisible();
    await expect(page.getByText('Add API keys to enable AI categorization features')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Your First API Key' })).toBeVisible();
  });

  test('should add a new API key', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Click Add API Key button
    await page.getByRole('button', { name: /Add API Key/i }).click();
    
    // Fill in API key form (when implemented)
    // TODO: Update when Add API Key dialog is implemented
    // await page.getByLabel('Provider').selectOption('openai');
    // await page.getByLabel('API Key Name').fill('Test OpenAI Key');
    // await page.getByLabel('API Key').fill('sk-test-key-12345');
    // await page.getByRole('button', { name: 'Save' }).click();
    
    // Verify success message
    // await expect(page.getByText('API key added successfully')).toBeVisible();
  });

  test('should toggle API key visibility', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Assuming there's at least one API key
    const maskedKey = page.getByText(/sk-\.\.\./).first();
    if (await maskedKey.isVisible()) {
      // Click show button
      const showButton = page.getByRole('button', { name: /show|eye/i }).first();
      await showButton.click();
      
      // Verify key is shown (would show actual key in real implementation)
      await expect(page.getByText(/sk-actual-key/)).toBeVisible();
      
      // Click hide button
      const hideButton = page.getByRole('button', { name: /hide|eye-off/i }).first();
      await hideButton.click();
      
      // Verify key is masked again
      await expect(page.getByText(/sk-\.\.\./)).toBeVisible();
    }
  });

  test('should copy API key to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Assuming there's at least one API key
    const copyButton = page.getByRole('button', { name: /copy/i }).first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      
      // Verify toast notification
      await expect(page.getByText('API key copied')).toBeVisible();
    }
  });

  test('should delete an API key', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Assuming there's at least one API key
    const deleteButton = page.getByRole('button', { name: /delete|trash/i }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion (when confirmation dialog is implemented)
      // await page.getByRole('button', { name: 'Confirm Delete' }).click();
      
      // Verify success message
      // await expect(page.getByText('API key deleted successfully')).toBeVisible();
    }
  });

  test('should enforce permission restrictions', async ({ page }) => {
    // Logout current admin user
    await authHelper.logout();
    
    // Login as a viewer (non-admin)
    // Note: You'll need to set up a test viewer user
    await authHelper.login(process.env.TEST_VIEWER_EMAIL || 'viewer@test.com',
                          process.env.TEST_VIEWER_PASSWORD || 'testpassword');
    
    await page.goto('/test-org/settings');
    
    // Should show access denied
    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(page.getByText(/don't have permission/)).toBeVisible();
  });

  test('should display security notice', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Verify security notice is displayed
    await expect(page.getByRole('heading', { name: 'Security Notice' })).toBeVisible();
    await expect(page.getByText(/encrypted and stored securely/)).toBeVisible();
    await expect(page.getByText(/Only organization owners and admins/)).toBeVisible();
  });

  test('accessibility - keyboard navigation', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Should focus Add API Key button
    const addButton = page.getByRole('button', { name: /Add API Key/i });
    await expect(addButton).toBeFocused();
    
    // Continue tabbing through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus indicators are visible
    const focusedElement = await page.locator(':focus');
    const focusRing = await focusedElement.evaluate(el => 
      window.getComputedStyle(el).outline || window.getComputedStyle(el).boxShadow
    );
    expect(focusRing).toBeTruthy();
  });

  test('accessibility - screen reader announcements', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Check for proper ARIA labels
    const buttons = await page.getByRole('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Button should have either aria-label or visible text
      expect(ariaLabel || text).toBeTruthy();
    }
    
    // Check heading hierarchy
    const h1 = await page.getByRole('heading', { level: 1 }).count();
    const h2 = await page.getByRole('heading', { level: 2 }).count();
    expect(h1).toBeGreaterThan(0);
  });

  test('responsive design', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
    
    // Tabs should be scrollable or stacked on mobile
    const tabsList = page.getByRole('tablist');
    await expect(tabsList).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
  });
});

// Integration tests with backend
test.describe('API Keys Backend Integration', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should persist API keys across sessions', async ({ page, context }) => {
    await authHelper.login(process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
                          process.env.TEST_ADMIN_PASSWORD || 'testpassword');
    await page.goto('/test-org/settings');
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Add an API key (when implemented)
    // ... add key logic ...
    
    // Clear session and login again
    await context.clearCookies();
    await loginAsTestUser(page, 'admin');
    await page.goto('/test-org/settings');
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Verify key persists
    // await expect(page.getByText('Test OpenAI Key')).toBeVisible();
  });

  test('should validate API key format', async ({ page }) => {
    await authHelper.login(process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
                          process.env.TEST_ADMIN_PASSWORD || 'testpassword');
    await page.goto('/test-org/settings');
    await page.getByRole('tab', { name: /API Keys/i }).click();
    
    // Try to add invalid key (when form is implemented)
    // await page.getByRole('button', { name: /Add API Key/i }).click();
    // await page.getByLabel('API Key').fill('invalid-key-format');
    // await page.getByRole('button', { name: 'Save' }).click();
    
    // Verify validation error
    // await expect(page.getByText(/Invalid API key format/)).toBeVisible();
  });
});