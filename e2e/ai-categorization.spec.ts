import { test, expect } from '@playwright/test';

test.describe('AI Categorization', () => {
  test.use({
    storageState: 'e2e/.auth/user.json', // Assumes authenticated state
  });

  test.skip('should display AI categorization page', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Check page title
    await expect(page.locator('h1')).toContainText('AI Categorization');

    // Check for job list
    const jobList = page.locator('[data-testid="categorization-jobs"]');
    await expect(jobList.or(page.locator('table'))).toBeVisible();
  });

  test.skip('should create a new categorization job', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Click create job button
    await page.click('button:has-text("Create Categorization Job")');

    // Check dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Create Categorization Job');

    // Select products to categorize
    await page.click('button:has-text("Select Products")');

    // Select some products (assuming checkbox selection)
    await page.click('input[type="checkbox"]').first();
    await page.click('input[type="checkbox"]').nth(1);

    // Configure AI settings
    await page.selectOption('select[name="model"]', 'gpt-4');
    await page.fill('input[name="temperature"]', '0.7');

    // Submit job
    await page.click('button:has-text("Start Categorization")');

    // Check for success message
    await expect(page.locator('text=Categorization job created')).toBeVisible();
  });

  test.skip('should show job progress', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Find a running job
    const runningJob = page.locator('[data-testid="job-status"]:has-text("Running")').first();

    if (await runningJob.isVisible()) {
      // Check for progress indicator
      const progressBar = page.locator('[role="progressbar"]');
      await expect(progressBar).toBeVisible();

      // Check for processed count
      await expect(page.locator('text=/\\d+ \\/ \\d+ products/')).toBeVisible();
    }
  });

  test.skip('should view job results', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Find a completed job
    const completedJob = page.locator('[data-testid="job-row"]:has-text("Completed")').first();

    if (await completedJob.isVisible()) {
      // Click view results
      await completedJob.locator('button:has-text("View Results")').click();

      // Check results dialog/page opens
      await expect(page.locator('text=Categorization Results')).toBeVisible();

      // Check for results table
      const resultsTable = page.locator('[data-testid="categorization-results"]');
      await expect(resultsTable).toBeVisible();

      // Check for product names and assigned categories
      await expect(page.locator('text=Product')).toBeVisible();
      await expect(page.locator('text=Assigned Categories')).toBeVisible();
    }
  });

  test.skip('should apply categorization results', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Open a completed job's results
    const completedJob = page.locator('[data-testid="job-row"]:has-text("Completed")').first();
    await completedJob.locator('button:has-text("View Results")').click();

    // Select some results to apply
    await page.click('input[type="checkbox"][data-testid="select-result"]').first();
    await page.click('input[type="checkbox"][data-testid="select-result"]').nth(1);

    // Apply selected categorizations
    await page.click('button:has-text("Apply Selected")');

    // Confirm action
    await page.click('button:has-text("Confirm")');

    // Check for success message
    await expect(page.locator('text=Categories applied successfully')).toBeVisible();
  });

  test.skip('should filter jobs by status', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Check for status filter
    const statusFilter = page.locator('select[name="status"]');
    await expect(statusFilter.or(page.locator('[data-testid="status-filter"]'))).toBeVisible();

    // Filter by completed jobs
    await statusFilter.selectOption('completed');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Check all visible jobs are completed
    const jobStatuses = page.locator('[data-testid="job-status"]');
    const count = await jobStatuses.count();

    for (let i = 0; i < count; i++) {
      await expect(jobStatuses.nth(i)).toContainText('Completed');
    }
  });

  test.skip('should cancel a running job', async ({ page }) => {
    await page.goto('/ai-categorization');

    // Find a running job
    const runningJob = page.locator('[data-testid="job-row"]:has-text("Running")').first();

    if (await runningJob.isVisible()) {
      // Click cancel button
      await runningJob.locator('button:has-text("Cancel")').click();

      // Confirm cancellation
      await page.click('button:has-text("Yes, Cancel")');

      // Check status changes to cancelled
      await expect(runningJob.locator('[data-testid="job-status"]')).toContainText('Cancelled');
    }
  });

  test.skip('should show AI model configuration options', async ({ page }) => {
    await page.goto('/ai-categorization');
    await page.click('button:has-text("Create Categorization Job")');

    // Check for AI configuration options
    await expect(page.locator('label:has-text("AI Model")')).toBeVisible();
    await expect(page.locator('label:has-text("Temperature")')).toBeVisible();
    await expect(page.locator('label:has-text("Max Categories")')).toBeVisible();

    // Check model options
    const modelSelect = page.locator('select[name="model"]');
    const options = await modelSelect.locator('option').allTextContents();
    expect(options).toContain('gpt-4');
    expect(options).toContain('gpt-3.5-turbo');
  });
});
