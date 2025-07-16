# E2E Testing Guide

This directory contains end-to-end tests using Playwright for testing critical user flows in the Bulk Grillers Pride application.

## Structure

```
e2e/
├── auth/
│   └── auth.spec.ts          # Authentication flow tests
├── categories/
│   └── categories.spec.ts    # Category management tests
├── products/
│   └── products.spec.ts      # Product management tests
├── helpers/
│   └── auth.helper.ts        # Authentication helper functions
├── ai-categorization.spec.ts # AI categorization workflow tests
└── homepage.spec.ts          # Homepage and landing page tests
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed
```

### Test Reports

```bash
# View HTML report after test run
npm run test:e2e:report
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await page.click('button');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Using Test Helpers

```typescript
import { AuthHelper } from '../helpers/auth.helper';

test('authenticated flow', async ({ page }) => {
  const auth = new AuthHelper(page);
  await auth.login('user@example.com', 'password');

  // Test authenticated features
  await auth.expectToBeLoggedIn();
});
```

## Test Data

### Environment Variables

Set these in your `.env.local` or CI environment:

```bash
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=securepassword123

# Application URLs
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CONVEX_URL=https://...
```

### Test Isolation

- Tests should be independent and not rely on data from other tests
- Use `test.beforeEach` to set up test data
- Clean up test data in `test.afterEach` if needed

## Authentication

### Setting Up Test Users

1. Create test users in Clerk dashboard
2. Set credentials in environment variables
3. Use auth helper for consistent login/logout

### Saving Authentication State

For faster test execution, you can save authentication state:

```typescript
// Save auth state after login
await page.context().storageState({ path: 'e2e/.auth/user.json' });

// Use saved auth state in tests
test.use({
  storageState: 'e2e/.auth/user.json',
});
```

## Best Practices

### 1. Use Data Attributes

Add `data-testid` attributes to elements for reliable selection:

```tsx
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.click('[data-testid="submit-button"]');
```

### 2. Wait for Elements

Use proper waiting strategies:

```typescript
// Wait for element to be visible
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });

// Wait for navigation
await page.waitForURL('/dashboard');

// Wait for network idle
await page.waitForLoadState('networkidle');
```

### 3. Assertions

Use Playwright's built-in assertions:

```typescript
// Element assertions
await expect(page.locator('h1')).toBeVisible();
await expect(page.locator('input')).toHaveValue('expected');
await expect(page.locator('button')).toBeDisabled();

// Page assertions
await expect(page).toHaveURL('/expected-url');
await expect(page).toHaveTitle('Expected Title');
```

### 4. Error Handling

Handle expected errors gracefully:

```typescript
try {
  await page.click('button', { timeout: 5000 });
} catch (error) {
  // Handle timeout or element not found
}
```

## CI/CD Integration

E2E tests run automatically in GitHub Actions:

- On pull requests to main/develop
- After successful build
- Results uploaded as artifacts

### Debugging CI Failures

1. Check test artifacts in GitHub Actions
2. Download and view HTML report
3. Check screenshots/videos for visual debugging

## Troubleshooting

### Common Issues

**Tests timing out:**

- Increase timeout: `test.setTimeout(60000);`
- Check if dev server is running
- Verify network requests are completing

**Element not found:**

- Check if element has loaded
- Verify selector is correct
- Add `data-testid` for reliability

**Authentication failures:**

- Verify test credentials
- Check Clerk configuration
- Ensure cookies are preserved

### Running Specific Browsers

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Mobile only
npx playwright test --project="Mobile Chrome"
```

## Maintenance

### Updating Selectors

When UI changes:

1. Update selectors in tests
2. Add data-testid attributes if missing
3. Run tests locally before pushing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `feature.spec.ts`
3. Add helper functions if needed
4. Update this README with new patterns
