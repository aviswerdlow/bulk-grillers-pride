import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Bulk Grillers Pride/i);
  });

  test('should display hero section', async ({ page }) => {
    // Check for hero content
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    // Check for main heading
    await expect(page.locator('h1')).toContainText(/Transform Your E-commerce/i);
  });

  test('should display navigation links', async ({ page }) => {
    // Check for header
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check for navigation links
    await expect(page.locator('a[href="/sign-in"]')).toBeVisible();
    await expect(page.locator('a[href="/sign-up"]')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.click('a[href="/sign-in"]');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.click('a[href="/sign-up"]');
    await expect(page).toHaveURL(/sign-up/);
  });

  test('should display features section', async ({ page }) => {
    // Check for features
    const features = [
      'AI-Powered Categorization',
      'Multi-tenant Architecture',
      'Real-time Updates',
    ];

    for (const feature of features) {
      await expect(page.locator('text=' + feature)).toBeVisible();
    }
  });

  test('should display call-to-action buttons', async ({ page }) => {
    // Check for CTA buttons
    const getStartedButton = page.locator('a:has-text("Get Started Free")');
    await expect(getStartedButton).toBeVisible();

    // Click should navigate to sign-up
    await getStartedButton.click();
    await expect(page).toHaveURL(/sign-up/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that navigation is still accessible (might be in a hamburger menu)
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Hero section should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Check meta description
    const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
    expect(metaDescription).toBeTruthy();

    // Check Open Graph tags
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBeTruthy();
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like favicon.ico 404)
    const unexpectedErrors = errors.filter(
      (error) => !error.includes('favicon.ico') && !error.includes('Failed to load resource')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
