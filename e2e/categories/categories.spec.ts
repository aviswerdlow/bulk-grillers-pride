import { test, expect } from '@playwright/test';

test.describe('Categories Management', () => {
  test.use({
    storageState: 'e2e/.auth/user.json', // Assumes authenticated state
  });

  test.skip('should display categories page', async ({ page }) => {
    await page.goto('/categories');

    // Check page title
    await expect(page.locator('h1')).toContainText('Categories');

    // Check for category tree or list
    const categoryList = page.locator('[data-testid="category-list"]');
    await expect(categoryList.or(page.locator('[data-testid="category-tree"]'))).toBeVisible();
  });

  test.skip('should create a root category', async ({ page }) => {
    await page.goto('/categories');

    // Click create category button
    await page.click('button:has-text("Create Category")');

    // Fill in category details
    await page.fill('input[name="name"]', 'Test Root Category');
    await page.fill('textarea[name="description"]', 'This is a test root category');

    // Submit form
    await page.click('button:has-text("Create")');

    // Check for success message
    await expect(page.locator('text=Category created successfully')).toBeVisible();

    // Check category appears in list
    await expect(page.locator('text=Test Root Category')).toBeVisible();
  });

  test.skip('should create a subcategory', async ({ page }) => {
    await page.goto('/categories');

    // Select parent category first
    await page.click('text=Test Root Category');

    // Click create subcategory button
    await page.click('button:has-text("Add Subcategory")');

    // Fill in subcategory details
    await page.fill('input[name="name"]', 'Test Subcategory');
    await page.fill('textarea[name="description"]', 'This is a test subcategory');

    // Submit form
    await page.click('button:has-text("Create")');

    // Check for success message
    await expect(page.locator('text=Category created successfully')).toBeVisible();

    // Check subcategory appears under parent
    const parentCategory = page.locator('text=Test Root Category');
    const subcategory = page.locator('text=Test Subcategory');
    await expect(subcategory).toBeVisible();
  });

  test.skip('should edit a category', async ({ page }) => {
    await page.goto('/categories');

    // Click edit on a category
    await page.click('[data-testid="edit-category-button"]').first();

    // Update category name
    await page.fill('input[name="name"]', 'Updated Category Name');

    // Save changes
    await page.click('button:has-text("Save")');

    // Check for success message
    await expect(page.locator('text=Category updated successfully')).toBeVisible();

    // Check updated name appears
    await expect(page.locator('text=Updated Category Name')).toBeVisible();
  });

  test.skip('should expand and collapse category tree', async ({ page }) => {
    await page.goto('/categories');

    // Find a category with children (has expand button)
    const expandButton = page.locator('[data-testid="expand-category"]').first();

    if (await expandButton.isVisible()) {
      // Click to expand
      await expandButton.click();

      // Check children are visible
      const children = page.locator('[data-testid="category-children"]').first();
      await expect(children).toBeVisible();

      // Click to collapse
      await expandButton.click();

      // Check children are hidden
      await expect(children).not.toBeVisible();
    }
  });

  test.skip('should search categories', async ({ page }) => {
    await page.goto('/categories');

    // Type in search box
    await page.fill('input[placeholder*="Search categories"]', 'Test');

    // Wait for results to filter
    await page.waitForTimeout(500);

    // Check that results are filtered
    const categories = page.locator('[data-testid="category-item"]');
    const count = await categories.count();

    if (count > 0) {
      // Verify visible categories contain search term
      for (let i = 0; i < count; i++) {
        const text = await categories.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('test');
      }
    }
  });

  test.skip('should delete a category without children', async ({ page }) => {
    await page.goto('/categories');

    // Find a category without children
    const deleteButton = page.locator('[data-testid="delete-category-button"]').last();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      await page.click('button:has-text("Delete")');

      // Check for success message
      await expect(page.locator('text=Category deleted successfully')).toBeVisible();
    }
  });

  test.skip('should show error when trying to delete category with children', async ({ page }) => {
    await page.goto('/categories');

    // Try to delete a parent category
    const parentCategory = page
      .locator('[data-testid="category-item"]:has([data-testid="expand-category"])')
      .first();

    if (await parentCategory.isVisible()) {
      const deleteButton = parentCategory.locator('[data-testid="delete-category-button"]');
      await deleteButton.click();

      // Confirm deletion attempt
      await page.click('button:has-text("Delete")');

      // Check for error message
      await expect(page.locator('text=Cannot delete category with subcategories')).toBeVisible();
    }
  });

  test.skip('should import categories from CSV', async ({ page }) => {
    await page.goto('/categories');

    // Click import button
    await page.click('button:has-text("Import Categories")');

    // Check import dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Import Categories');

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
  });
});
