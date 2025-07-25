import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to sign-in page', async ({ page }) => {
    // Try to access protected route
    await page.goto('/org/test-org/dashboard');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/);
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('should show sign-up page', async ({ page }) => {
    await page.goto('/sign-up');
    
    // Check sign-up page elements
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate between sign-in and sign-up', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Click on sign up link
    const signUpLink = page.getByText("Don't have an account?").locator('..').getByRole('link');
    await signUpLink.click();
    
    // Should be on sign-up page
    await expect(page).toHaveURL(/.*sign-up/);
    
    // Click on sign in link
    const signInLink = page.getByText('Already have an account?').locator('..').getByRole('link');
    await signInLink.click();
    
    // Should be back on sign-in page
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Fill in invalid credentials
    await page.getByLabel('Email address').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid credentials|incorrect email or password/i)).toBeVisible({ timeout: 10000 });
  });

  // Note: Successful sign-in test requires valid test credentials
  test.skip('should successfully sign in with valid credentials', async ({ page }) => {
    // This test is skipped by default as it requires valid Clerk test credentials
    // To enable, set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    
    if (!email || !password) {
      test.skip();
      return;
    }
    
    await page.goto('/sign-in');
    
    // Fill in credentials
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByText(/welcome|dashboard/i)).toBeVisible();
  });
});