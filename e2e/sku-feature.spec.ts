import { test, expect } from '@playwright/test';
import { createTestUser, createTestOrganization, createTestProduct } from '@bulk-grillers-pride/test-factories';

test.describe('SKU Feature E2E Tests', () => {
  // Test data
  const testUser = createTestUser();
  const testOrg = createTestOrganization();
  const testProduct = createTestProduct({ sku: 'E2E-TEST-001' });

  test.beforeEach(async ({ page }) => {
    // Login and navigate to products page
    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Navigate to products
    await page.click('a[href*="/products"]');
    await page.waitForURL('**/products');
  });

  test.describe('SKU Display', () => {
    test('displays SKU column in products table', async ({ page }) => {
      // Check for SKU column header
      const skuHeader = page.locator('th:has-text("SKU")');
      await expect(skuHeader).toBeVisible();
      
      // Check for SKU values in table
      const skuCells = page.locator('td[data-testid^="sku-"]');
      const count = await skuCells.count();
      expect(count).toBeGreaterThan(0);
      
      // Verify some cells have SKU values
      const firstSku = await skuCells.first().textContent();
      expect(firstSku).toBeTruthy();
    });

    test('shows SKU in product cards view', async ({ page }) => {
      // Switch to card view if available
      const cardViewButton = page.locator('button[aria-label="Card view"]');
      if (await cardViewButton.isVisible()) {
        await cardViewButton.click();
      }
      
      // Check for SKU in product cards
      const productCards = page.locator('[data-testid="product-card"]');
      const firstCard = productCards.first();
      
      const skuElement = firstCard.locator('[data-testid="product-sku"]');
      await expect(skuElement).toBeVisible();
      
      const skuText = await skuElement.textContent();
      expect(skuText).toMatch(/^[A-Z0-9-]+$|No SKU/);
    });

    test('displays SKU in product detail view', async ({ page }) => {
      // Click on first product
      const firstProduct = page.locator('tr[data-testid^="product-row-"]').first();
      await firstProduct.click();
      
      // Wait for product detail modal/page
      await page.waitForSelector('[data-testid="product-detail"]');
      
      // Check for SKU field
      const skuField = page.locator('[data-testid="product-detail-sku"]');
      await expect(skuField).toBeVisible();
      
      const skuLabel = page.locator('text=SKU').first();
      await expect(skuLabel).toBeVisible();
    });
  });

  test.describe('SKU Creation', () => {
    test('allows adding SKU when creating a product', async ({ page }) => {
      // Click create product button
      await page.click('button:has-text("Create Product")');
      
      // Wait for dialog
      await page.waitForSelector('[role="dialog"]');
      
      // Fill product form
      await page.fill('[name="title"]', 'E2E Test Product');
      await page.fill('[name="description"]', 'Test product for E2E tests');
      await page.fill('[name="sku"]', 'E2E-NEW-001');
      await page.fill('[name="price"]', '29.99');
      
      // Select category if required
      const categorySelect = page.locator('[name="categoryId"]');
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption({ index: 1 });
      }
      
      // Submit form
      await page.click('button:has-text("Create")');
      
      // Wait for success toast
      await expect(page.locator('.toast-success')).toBeVisible();
      
      // Verify product appears in list with SKU
      await page.waitForSelector(`text=E2E-NEW-001`);
    });

    test('validates SKU format during creation', async ({ page }) => {
      // Click create product button
      await page.click('button:has-text("Create Product")');
      
      // Wait for dialog
      await page.waitForSelector('[role="dialog"]');
      
      // Test invalid SKU formats
      const skuInput = page.locator('[name="sku"]');
      
      // Too short
      await skuInput.fill('AB');
      await skuInput.blur();
      await expect(page.locator('text=SKU must be at least 3 characters')).toBeVisible();
      
      // Invalid characters
      await skuInput.fill('test@123');
      await skuInput.blur();
      await expect(page.locator('text=SKU can only contain letters, numbers, and hyphens')).toBeVisible();
      
      // Valid format
      await skuInput.fill('TEST-123');
      await skuInput.blur();
      await expect(page.locator('text=SKU must be')).not.toBeVisible();
    });

    test('prevents duplicate SKUs', async ({ page }) => {
      // Create first product with SKU
      await page.click('button:has-text("Create Product")');
      await page.fill('[name="title"]', 'First Product');
      await page.fill('[name="sku"]', 'DUPLICATE-001');
      await page.fill('[name="price"]', '19.99');
      await page.click('button:has-text("Create")');
      await expect(page.locator('.toast-success')).toBeVisible();
      
      // Try to create second product with same SKU
      await page.click('button:has-text("Create Product")');
      await page.fill('[name="title"]', 'Second Product');
      await page.fill('[name="sku"]', 'DUPLICATE-001');
      await page.fill('[name="price"]', '29.99');
      await page.click('button:has-text("Create")');
      
      // Should show error
      await expect(page.locator('text=SKU already exists')).toBeVisible();
    });
  });

  test.describe('SKU Search', () => {
    test('searches products by SKU', async ({ page }) => {
      // Use search input
      const searchInput = page.locator('[placeholder*="Search"]');
      await searchInput.fill('MEAT-001');
      await searchInput.press('Enter');
      
      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce
      
      // Check that results contain the SKU
      const results = page.locator('tr[data-testid^="product-row-"]');
      const count = await results.count();
      
      if (count > 0) {
        const firstResult = results.first();
        const skuCell = firstResult.locator('td[data-testid^="sku-"]');
        const skuText = await skuCell.textContent();
        expect(skuText).toContain('MEAT-001');
      }
    });

    test('supports partial SKU search', async ({ page }) => {
      const searchInput = page.locator('[placeholder*="Search"]');
      await searchInput.fill('MEAT');
      await searchInput.press('Enter');
      
      await page.waitForTimeout(500);
      
      // Should return multiple results
      const results = page.locator('tr[data-testid^="product-row-"]');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
      
      // All results should contain "MEAT" in SKU
      for (let i = 0; i < Math.min(count, 5); i++) {
        const skuCell = results.nth(i).locator('td[data-testid^="sku-"]');
        const skuText = await skuCell.textContent();
        if (skuText && skuText !== '-') {
          expect(skuText).toContain('MEAT');
        }
      }
    });

    test('shows no results for non-existent SKU', async ({ page }) => {
      const searchInput = page.locator('[placeholder*="Search"]');
      await searchInput.fill('NONEXISTENT-999');
      await searchInput.press('Enter');
      
      await page.waitForTimeout(500);
      
      // Should show no results message
      await expect(page.locator('text=No products found')).toBeVisible();
    });
  });

  test.describe('SKU Copy Functionality', () => {
    test('copies SKU to clipboard from table', async ({ page }) => {
      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-write']);
      
      // Find a product with SKU
      const skuCell = page.locator('td[data-testid^="sku-"]:not(:has-text("-"))').first();
      const skuText = await skuCell.textContent();
      
      // Click copy button
      const copyButton = skuCell.locator('button[aria-label*="Copy SKU"]');
      await copyButton.click();
      
      // Check for success toast
      await expect(page.locator('text=SKU copied to clipboard')).toBeVisible();
      
      // Verify clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(skuText);
    });

    test('shows visual feedback when copying SKU', async ({ page }) => {
      await page.context().grantPermissions(['clipboard-write']);
      
      const skuCell = page.locator('td[data-testid^="sku-"]:not(:has-text("-"))').first();
      const copyButton = skuCell.locator('button[aria-label*="Copy SKU"]');
      
      // Check initial state
      const initialIcon = await copyButton.locator('svg').getAttribute('class');
      
      // Click copy button
      await copyButton.click();
      
      // Check for changed icon (checkmark)
      await expect(copyButton.locator('svg.text-green-600')).toBeVisible();
      
      // Wait for icon to revert
      await page.waitForTimeout(2000);
      const finalIcon = await copyButton.locator('svg').getAttribute('class');
      expect(finalIcon).toBe(initialIcon);
    });
  });

  test.describe('SKU Edit Functionality', () => {
    test('allows editing SKU in product details', async ({ page }) => {
      // Click on a product to edit
      const productRow = page.locator('tr[data-testid^="product-row-"]').first();
      await productRow.click();
      
      // Wait for edit dialog
      await page.waitForSelector('[role="dialog"]');
      
      // Click edit button if in view mode
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
      }
      
      // Edit SKU
      const skuInput = page.locator('[name="sku"]');
      await skuInput.clear();
      await skuInput.fill('UPDATED-SKU-001');
      
      // Save changes
      await page.click('button:has-text("Save")');
      
      // Wait for success
      await expect(page.locator('.toast-success')).toBeVisible();
      
      // Verify SKU updated in list
      await expect(page.locator('text=UPDATED-SKU-001')).toBeVisible();
    });

    test('allows clearing SKU', async ({ page }) => {
      // Find product with SKU
      const productWithSku = page.locator('tr[data-testid^="product-row-"]:has(td[data-testid^="sku-"]:not(:has-text("-")))').first();
      await productWithSku.click();
      
      await page.waitForSelector('[role="dialog"]');
      
      // Edit mode
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
      }
      
      // Clear SKU
      const skuInput = page.locator('[name="sku"]');
      await skuInput.clear();
      
      // Save
      await page.click('button:has-text("Save")');
      await expect(page.locator('.toast-success')).toBeVisible();
      
      // Close dialog
      await page.keyboard.press('Escape');
      
      // Verify SKU is cleared (shows "-")
      const skuCell = productWithSku.locator('td[data-testid^="sku-"]');
      await expect(skuCell).toHaveText('-');
    });
  });

  test.describe('SKU Bulk Import', () => {
    test('includes SKU in CSV import template', async ({ page }) => {
      // Navigate to imports page
      await page.click('a[href*="/imports"]');
      await page.waitForURL('**/imports');
      
      // Download template
      await page.click('button:has-text("Download Template")');
      
      // Wait for download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Download Template")')
      ]);
      
      // Read downloaded file
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const content = fs.readFileSync(path, 'utf-8');
        
        // Check for SKU column
        expect(content).toContain('sku');
        expect(content.split('\n')[0].split(',')).toContain('sku');
      }
    });

    test('validates SKUs during import', async ({ page }) => {
      // Navigate to imports
      await page.click('a[href*="/imports"]');
      
      // Click import button
      await page.click('button:has-text("Import Products")');
      
      // Create test CSV with duplicate SKUs
      const csvContent = `title,sku,price,status
Product 1,IMPORT-001,29.99,active
Product 2,IMPORT-001,39.99,active
Product 3,IMPORT-002,49.99,active`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const fileName = 'test-import.csv';
      
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: fileName,
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      });
      
      // Process import
      await page.click('button:has-text("Validate")');
      
      // Should show validation error
      await expect(page.locator('text=Duplicate SKU')).toBeVisible();
      await expect(page.locator('text=IMPORT-001')).toBeVisible();
    });
  });

  test.describe('SKU Performance', () => {
    test('loads products with SKUs efficiently', async ({ page }) => {
      // Measure initial load time
      const startTime = Date.now();
      
      await page.goto('/products');
      await page.waitForSelector('tr[data-testid^="product-row-"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check that SKUs are visible
      const skuCells = await page.locator('td[data-testid^="sku-"]').count();
      expect(skuCells).toBeGreaterThan(0);
    });

    test('searches SKUs quickly', async ({ page }) => {
      const searchInput = page.locator('[placeholder*="Search"]');
      
      // Measure search time
      const startTime = Date.now();
      
      await searchInput.fill('MEAT-001');
      await searchInput.press('Enter');
      
      // Wait for results
      await page.waitForSelector('tr[data-testid^="product-row-"]', { timeout: 1000 });
      
      const searchTime = Date.now() - startTime;
      
      // Search should complete within 1 second
      expect(searchTime).toBeLessThan(1000);
    });

    test('handles large SKU lists efficiently', async ({ page }) => {
      // Navigate to a page with many products
      await page.goto('/products?limit=100');
      
      // Measure render time
      const startTime = Date.now();
      
      await page.waitForSelector('tr[data-testid^="product-row-"]:nth-child(50)');
      
      const renderTime = Date.now() - startTime;
      
      // Should render 50+ products within 2 seconds
      expect(renderTime).toBeLessThan(2000);
      
      // Verify SKUs are rendered
      const skuCount = await page.locator('td[data-testid^="sku-"]').count();
      expect(skuCount).toBeGreaterThanOrEqual(50);
    });
  });
});