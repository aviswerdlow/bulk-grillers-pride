# E2E Testing Guide

This guide covers end-to-end (E2E) testing setup and best practices for the Bulk Grillers Pride application.

## Overview

E2E tests verify complete user workflows from the UI through to the backend. We use Playwright for cross-browser testing with support for Chrome, Firefox, Safari, and Edge.

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- All project dependencies installed (`npm install`)

### Install Playwright Browsers

```bash
# Install browsers (one-time setup)
npx playwright install

# Install with system dependencies (for CI environments)
npx playwright install --with-deps
```

## Running Tests

### Local Development

**Important**: The application must be running before executing E2E tests locally.

```bash
# Start the application first
npm run dev

# In a new terminal, run E2E tests
npm run test:e2e

# Run tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### CI/CD

Tests run automatically in GitHub Actions on:
- Pull requests to main/develop branches
- Pushes to main/develop branches

The CI workflow:
1. Builds the application
2. Installs Playwright browsers
3. Runs all E2E tests
4. Uploads test reports as artifacts

## Test Structure

```
e2e/
├── ai-categorization.spec.ts   # AI categorization feature tests
├── auth.spec.ts                # Authentication flow tests  
├── navigation.spec.ts          # Navigation and routing tests
├── products.spec.ts            # Product management tests
├── accessibility.spec.ts       # WCAG compliance tests
└── example.spec.ts            # Example test from Playwright
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.getByRole('button', { name: 'Click me' });
    
    // Act
    await button.click();
    
    // Assert
    await expect(page).toHaveURL('/expected-url');
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic locators**
   ```typescript
   // Good
   page.getByRole('button', { name: 'Submit' })
   page.getByLabel('Email address')
   
   // Avoid
   page.locator('.btn-submit')
   page.locator('#email')
   ```

2. **Wait for elements properly**
   ```typescript
   // Good - automatic waiting
   await expect(page.getByText('Loading')).toBeHidden();
   
   // Avoid - fixed timeouts
   await page.waitForTimeout(3000);
   ```

3. **Test user workflows, not implementation**
   ```typescript
   // Good - tests user experience
   test('user can create a product', async ({ page }) => {
     await page.getByRole('button', { name: 'Add Product' }).click();
     await page.getByLabel('Product Name').fill('Test Product');
     await page.getByRole('button', { name: 'Save' }).click();
     await expect(page.getByText('Product created')).toBeVisible();
   });
   ```

4. **Use test data appropriately**
   ```typescript
   // Create unique test data
   const testProduct = {
     name: `Test Product ${Date.now()}`,
     sku: `SKU-${Date.now()}`,
     price: 99.99
   };
   ```

## Authentication in Tests

### Testing Without Authentication

For public pages and auth flows:

```typescript
test('should redirect to sign-in', async ({ page }) => {
  await page.goto('/protected-route');
  await expect(page).toHaveURL(/.*sign-in/);
});
```

### Testing With Authentication

For authenticated flows, you'll need to:

1. Set up test user credentials in environment variables
2. Create an authentication state file
3. Use the auth state in tests

```typescript
// Setup auth state (run once)
test('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  // Save auth state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});

// Use auth state in tests
test.use({
  storageState: 'e2e/.auth/user.json'
});
```

## Accessibility Testing

We use axe-core for automated accessibility testing:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Environment Variables

Required for E2E tests:

```env
# Application URLs
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud

# Test User Credentials (optional)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=secure_password
```

## Debugging Tests

### Visual Debugging

```bash
# Run in UI mode
npm run test:e2e:ui

# Run in debug mode (opens browser with inspector)
npm run test:e2e:debug
```

### Console Logs

```typescript
test('debug example', async ({ page }) => {
  // Log page errors
  page.on('pageerror', error => console.error(error));
  
  // Log console messages
  page.on('console', msg => console.log(msg.text()));
  
  // Take screenshots
  await page.screenshot({ path: 'debug.png' });
});
```

### VSCode Integration

Install the Playwright Test extension for:
- Running tests from the editor
- Debugging with breakpoints
- Viewing test reports

## Performance Testing

Monitor performance metrics in tests:

```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000); // 3 seconds
  
  // Check Core Web Vitals
  const metrics = await page.evaluate(() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FID: performance.getEntriesByType('first-input')[0]?.processingStart,
    CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0)
  }));
  
  expect(metrics.LCP).toBeLessThan(2500); // 2.5s
  expect(metrics.CLS).toBeLessThan(0.1);  // 0.1
});
```

## Cross-Browser Testing

Configure browsers in playwright.config.ts:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
]
```

Run specific browser tests:

```bash
# Run only in Chrome
npx playwright test --project=chromium

# Run only mobile tests
npx playwright test --grep @mobile
```

## Continuous Integration

Tests run automatically in CI with:
- Parallel execution across 2 shards
- All major browsers
- Test artifacts uploaded on failure
- Integration with GitHub PR checks

View test results:
1. Go to Actions tab in GitHub
2. Click on the workflow run
3. Download playwright-report artifact
4. Extract and open index.html

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test or config
   - Check for proper element waiting
   - Verify selectors are correct

2. **Flaky tests**
   - Use proper waiting strategies
   - Avoid fixed timeouts
   - Check for race conditions

3. **Authentication issues**
   - Verify environment variables
   - Check Clerk configuration
   - Ensure test user exists

4. **CI failures**
   - Check browser installation
   - Verify environment variables in secrets
   - Review artifacts for screenshots

### Getting Help

- Check Playwright documentation: https://playwright.dev
- Review test examples in e2e/ directory
- Ask in team chat with error details