import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/sign-in');

    // Wait for Clerk auth form to load
    await this.page.waitForSelector('[data-clerk-form]', { timeout: 10000 });

    // Fill in email
    await this.page.fill('input[name="identifier"]', email);
    await this.page.click('button[type="submit"]');

    // Wait for password field
    await this.page.waitForSelector('input[name="password"]', { timeout: 5000 });

    // Fill in password
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  async logout() {
    // Click on user menu (assuming it exists in header)
    await this.page.click('[data-testid="user-menu"]');

    // Click logout button
    await this.page.click('[data-testid="logout-button"]');

    // Wait for redirect to home page
    await this.page.waitForURL('/');
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      // Check if user menu is visible
      await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async expectToBeLoggedIn() {
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  async expectToBeLoggedOut() {
    await expect(this.page).toHaveURL('/');
    await expect(this.page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  }
}
