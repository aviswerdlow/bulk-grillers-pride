import { test, expect } from '@playwright/test';

test.describe('Products Management', () => {
  test.use({
    storageState: 'e2e/.auth/user.json', // Assumes authenticated state
  });

  test.skip('should display products page', async ({ page }) => {
    // This test requires authentication
    await page.goto('/products');

    // Check page title
    await expect(page.locator('h1')).toContainText('Products');

    // Check for product table or grid
    const productList = page.locator('[data-testid="product-list"]');
    await expect(productList.or(page.locator('table'))).toBeVisible();
  });

  test.skip('should open create product dialog', async ({ page }) => {
    await page.goto('/products');

    // Click create product button
    await page.click('button:has-text("Create Product")');

    // Check dialog is open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Create Product');

    // Check form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="sku"]')).toBeVisible();
  });

  test.skip('should validate product form', async ({ page }) => {
    await page.goto('/products');
    await page.click('button:has-text("Create Product")');

    // Try to submit empty form
    await page.click('button:has-text("Create")');

    // Check for validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=SKU is required')).toBeVisible();
  });

  test.skip('should create a new product', async ({ page }) => {
    await page.goto('/products');
    await page.click('button:has-text("Create Product")');

    // Fill in product details
    await page.fill('input[name="name"]', 'Test Product');
    await page.fill('textarea[name="description"]', 'This is a test product description');
    await page.fill('input[name="sku"]', 'TEST-SKU-001');
    await page.fill('input[name="barcode"]', '1234567890');

    // Submit form
    await page.click('button:has-text("Create")');

    // Check for success message
    await expect(page.locator('text=Product created successfully')).toBeVisible();

    // Check product appears in list
    await expect(page.locator('text=Test Product')).toBeVisible();
  });

  test.skip('should search for products', async ({ page }) => {
    await page.goto('/products');

    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'Test');

    // Wait for results to filter
    await page.waitForTimeout(500);

    // Check that results are filtered
    const products = page.locator('[data-testid="product-item"]');
    const count = await products.count();

    if (count > 0) {
      // Verify all visible products contain search term
      for (let i = 0; i < count; i++) {
        const text = await products.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('test');
      }
    }
  });

  test.skip('should edit a product', async ({ page }) => {
    await page.goto('/products');

    // Click edit on first product
    await page.click('[data-testid="edit-product-button"]').first();

    // Check edit dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Edit Product');

    // Update product name
    await page.fill('input[name="name"]', 'Updated Product Name');

    // Save changes
    await page.click('button:has-text("Save")');

    // Check for success message
    await expect(page.locator('text=Product updated successfully')).toBeVisible();
  });

  test.skip('should delete a product', async ({ page }) => {
    await page.goto('/products');

    // Click delete on a product
    await page.click('[data-testid="delete-product-button"]').first();

    // Confirm deletion in dialog
    await page.click('button:has-text("Delete")');

    // Check for success message
    await expect(page.locator('text=Product deleted successfully')).toBeVisible();
  });

  test.skip('should display product categories', async ({ page }) => {
    await page.goto('/products');
    await page.click('[data-testid="product-item"]').first();

    // Check for category information
    await expect(page.locator('text=Categories')).toBeVisible();

    // Check for category selector
    const categorySelector = page.locator('[data-testid="category-selector"]');
    await expect(categorySelector.or(page.locator('text=Select categories'))).toBeVisible();
  });
});
