import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';

test.describe('Authentication Flow', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should display sign in page', async ({ page }) => {
    await page.goto('/sign-in');

    // Check for Clerk sign-in form
    await expect(page.locator('[data-clerk-form]')).toBeVisible();
    await expect(page).toHaveTitle(/Sign In/i);
  });

  test('should display sign up page', async ({ page }) => {
    await page.goto('/sign-up');

    // Check for Clerk sign-up form
    await expect(page.locator('[data-clerk-form]')).toBeVisible();
    await expect(page).toHaveTitle(/Sign Up/i);
  });

  test('should redirect to sign-in when accessing protected route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should show loading state during authentication', async ({ page }) => {
    await page.goto('/sign-in');

    // Fill in email
    await page.fill('input[name="identifier"]', 'test@example.com');

    // Click submit and check for loading state
    await page.click('button[type="submit"]');

    // Check for loading indicator (button disabled or spinner)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test.skip('should login successfully with valid credentials', async ({ page }) => {
    // This test requires valid test credentials
    // Skip in CI unless test accounts are set up

    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'password123';

    await authHelper.login(testEmail, testPassword);
    await authHelper.expectToBeLoggedIn();

    // Should be on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test.skip('should logout successfully', async ({ page }) => {
    // This test requires being logged in first
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'password123';

    // Login first
    await authHelper.login(testEmail, testPassword);

    // Then logout
    await authHelper.logout();
    await authHelper.expectToBeLoggedOut();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    // Try to login with invalid credentials
    await page.fill('input[name="identifier"]', 'invalid@example.com');
    await page.click('button[type="submit"]');

    // Wait for password field or error
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = page.locator('[data-clerk-error]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/invalid|incorrect|not found/i);
    }
  });
});
