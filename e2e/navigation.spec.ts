import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check landing page elements
    await expect(page.getByRole('heading', { name: /bulk grillers pride/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should have functioning navigation links on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Click sign in link
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/.*sign-in/);
    
    // Go back and click sign up link
    await page.goto('/');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/.*sign-up/);
  });

  test.skip('should navigate between dashboard sections', async ({ page }) => {
    // This test requires authentication
    await page.goto('/org/test-org/dashboard');
    
    // Check navigation sidebar
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Navigate to Products
    await nav.getByRole('link', { name: /products/i }).click();
    await expect(page).toHaveURL(/.*products/);
    
    // Navigate to Categories
    await nav.getByRole('link', { name: /categories/i }).click();
    await expect(page).toHaveURL(/.*categories/);
    
    // Navigate to AI Categorization
    await nav.getByRole('link', { name: /ai categorization/i }).click();
    await expect(page).toHaveURL(/.*ai-categorization/);
    
    // Navigate to Team
    await nav.getByRole('link', { name: /team/i }).click();
    await expect(page).toHaveURL(/.*team/);
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should show 404 or redirect to home/sign-in
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
  });

  test.skip('should show user menu when authenticated', async ({ page }) => {
    // This test requires authentication
    await page.goto('/org/test-org/dashboard');
    
    // Click on user menu
    const userButton = page.getByRole('button', { name: /user menu/i });
    await userButton.click();
    
    // Check menu items
    await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /sign out/i })).toBeVisible();
  });
});